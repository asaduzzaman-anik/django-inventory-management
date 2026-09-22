from decimal import Decimal
from threading import Thread

import pytest
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db import connection
from rest_framework.test import APIClient

from apps.accounts.models import User, UserWarehouse
from apps.audit.models import AuditLog
from apps.catalog.models import Category, Product
from apps.inventory.models import InventoryTransaction, StockLevel
from apps.inventory.services import BusinessRuleError
from apps.sales.models import SalesOrder
from apps.sales.services import complete_sales_order
from apps.warehouses.models import Warehouse

PASSWORD = "Str0ng-pass-word"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def catalog(db):
    call_command("seed_roles")
    category = Category.objects.create(name="Hardware", slug="hardware")
    bolt = Product.objects.create(
        sku="BOLT",
        name="Bolt",
        category=category,
        cost_price=Decimal("1.25"),
        selling_price=Decimal("2.50"),
    )
    main = Warehouse.objects.create(name="Main", code="MAIN")
    other = Warehouse.objects.create(name="Other", code="OTHER")
    return {"bolt": bolt, "main": main, "other": other}


def user_with_role(username, role, *warehouses):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password=PASSWORD)
    user.groups.add(Group.objects.get(name=role))
    for warehouse in warehouses:
        UserWarehouse.objects.create(user=user, warehouse=warehouse)
    return user


def stock(catalog, on_hand):
    return StockLevel.objects.create(
        product=catalog["bolt"],
        warehouse=catalog["main"],
        on_hand=on_hand,
        reserved=Decimal("0.000"),
    )


def order_body(catalog, quantity, **extra):
    body = {
        "warehouse": catalog["main"].pk,
        "customer_name": "Ada Lovelace",
        "discount_amount": "0.00",
        "tax_rate": "0.00",
        "items": [{"product": catalog["bolt"].pk, "quantity": quantity}],
    }
    body.update(extra)
    return body


@pytest.mark.django_db
def test_confirm_reserves_available_stock_and_blocks_the_next_order(api, catalog):
    seller = user_with_role("seller", "Sales Staff", catalog["main"])
    api.force_authenticate(user=seller)
    row = stock(catalog, Decimal("10.000"))

    oversell = api.post("/api/v1/sales-orders/", order_body(catalog, "11.000"), format="json")
    assert oversell.status_code == 201
    assert api.post(f"/api/v1/sales-orders/{oversell.data['id']}/confirm/").status_code == 409
    row.refresh_from_db()
    assert row.reserved == Decimal("0.000")

    created = api.post(
        "/api/v1/sales-orders/",
        order_body(catalog, "6.000", discount_amount="5.00", tax_rate="10.00"),
        format="json",
    )
    assert created.status_code == 201
    assert created.data["number"] == "SO-000002"
    assert created.data["items"][0]["unit_price"] == "2.50"
    assert created.data["subtotal"] == "15.00"
    assert created.data["tax_amount"] == "1.00"
    assert created.data["total"] == "11.00"
    catalog["bolt"].selling_price = Decimal("9.00")
    catalog["bolt"].save(update_fields=["selling_price"])
    assert api.get(f"/api/v1/sales-orders/{created.data['id']}/").data["items"][0]["unit_price"] == "2.50"

    confirmed = api.post(f"/api/v1/sales-orders/{created.data['id']}/confirm/")
    assert confirmed.status_code == 200
    assert confirmed.data["status"] == "CONFIRMED"
    row.refresh_from_db()
    assert row.reserved == Decimal("6.000")
    assert row.on_hand == Decimal("10.000")

    second = api.post("/api/v1/sales-orders/", order_body(catalog, "5.000"), format="json")
    blocked = api.post(f"/api/v1/sales-orders/{second.data['id']}/confirm/")
    assert blocked.status_code == 409
    assert blocked.data["code"] == "business_rule"
    row.refresh_from_db()
    assert row.reserved == Decimal("6.000")

    cancelled = api.post(f"/api/v1/sales-orders/{created.data['id']}/cancel/")
    assert cancelled.status_code == 200
    row.refresh_from_db()
    assert row.reserved == Decimal("0.000")
    assert api.post(f"/api/v1/sales-orders/{second.data['id']}/confirm/").status_code == 200
    row.refresh_from_db()
    assert row.reserved == Decimal("5.000")
    assert not InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.SALE).exists()


@pytest.mark.django_db
def test_complete_sale_return_cap_and_completed_order_stays_immutable(api, catalog):
    seller = user_with_role("seller", "Sales Staff", catalog["main"])
    api.force_authenticate(user=seller)
    row = stock(catalog, Decimal("10.000"))
    created = api.post("/api/v1/sales-orders/", order_body(catalog, "4.000"), format="json")
    order_id = created.data["id"]
    item_id = created.data["items"][0]["id"]
    api.post(f"/api/v1/sales-orders/{order_id}/confirm/")
    processed = api.post(f"/api/v1/sales-orders/{order_id}/process/")
    assert processed.data["status"] == "PROCESSING"
    row.refresh_from_db()
    assert row.reserved == Decimal("4.000")
    assert row.on_hand == Decimal("10.000")

    completed = api.post(f"/api/v1/sales-orders/{order_id}/complete/")
    assert completed.status_code == 200
    assert completed.data["status"] == "COMPLETED"
    row.refresh_from_db()
    assert row.on_hand == Decimal("6.000")
    assert row.reserved == Decimal("0.000")
    sale = InventoryTransaction.objects.get(transaction_type=InventoryTransaction.Type.SALE)
    assert sale.quantity_change == Decimal("-4.000")
    assert sale.balance_after == Decimal("6.000")

    locked = api.patch(f"/api/v1/sales-orders/{order_id}/", {"customer_name": "Changed"}, format="json")
    assert locked.status_code == 409
    paid = api.patch(f"/api/v1/sales-orders/{order_id}/payment/", {"payment_status": "PAID"}, format="json")
    assert paid.status_code == 200
    assert paid.data["status"] == "COMPLETED"
    assert paid.data["payment_status"] == "PAID"
    row.refresh_from_db()
    assert row.on_hand == Decimal("6.000")
    assert api.post(f"/api/v1/sales-orders/{order_id}/cancel/").status_code == 409

    too_many = api.post(
        f"/api/v1/sales-orders/{order_id}/returns/",
        {"items": [{"item_id": item_id, "quantity": "5.000"}]},
        format="json",
    )
    assert too_many.status_code == 409
    row.refresh_from_db()
    assert row.on_hand == Decimal("6.000")

    returned = api.post(
        f"/api/v1/sales-orders/{order_id}/returns/",
        {"items": [{"item_id": item_id, "quantity": "3.000"}]},
        format="json",
        HTTP_IDEMPOTENCY_KEY="ret-1",
    )
    assert returned.status_code == 201
    assert returned.data["number"] == "SR-000001"
    replay = api.post(
        f"/api/v1/sales-orders/{order_id}/returns/",
        {"items": [{"item_id": item_id, "quantity": "3.000"}]},
        format="json",
        HTTP_IDEMPOTENCY_KEY="ret-1",
    )
    assert replay.status_code == 200
    row.refresh_from_db()
    assert row.on_hand == Decimal("9.000")
    assert InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.RETURN).count() == 1

    assert (
        api.post(
            f"/api/v1/sales-orders/{order_id}/returns/",
            {"items": [{"item_id": item_id, "quantity": "2.000"}]},
            format="json",
        ).status_code
        == 409
    )
    last = api.post(
        f"/api/v1/sales-orders/{order_id}/returns/",
        {"items": [{"item_id": item_id, "quantity": "1.000"}]},
        format="json",
    )
    assert last.status_code == 201
    row.refresh_from_db()
    assert row.on_hand == Decimal("10.000")
    assert AuditLog.objects.filter(action=AuditLog.Action.STATUS_CHANGE).exists()
    assert AuditLog.objects.filter(action=AuditLog.Action.CREATE, entity_repr="SR-000001").exists()


@pytest.mark.django_db
def test_sales_permissions_and_warehouse_scope(api, catalog):
    seller = user_with_role("seller", "Sales Staff", catalog["main"])
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    viewer = user_with_role("viewer", "Viewer", catalog["main"])
    api.force_authenticate(user=seller)
    created = api.post(
        "/api/v1/sales-orders/",
        order_body(catalog, "1.000"),
        format="json",
        HTTP_IDEMPOTENCY_KEY="order-1",
    )
    assert created.status_code == 201
    replay = api.post(
        "/api/v1/sales-orders/",
        order_body(catalog, "1.000"),
        format="json",
        HTTP_IDEMPOTENCY_KEY="order-1",
    )
    assert replay.status_code == 200
    assert replay.data["id"] == created.data["id"]
    hidden = api.post(
        "/api/v1/sales-orders/",
        {**order_body(catalog, "1.000"), "warehouse": catalog["other"].pk},
        format="json",
    )
    assert hidden.status_code == 404

    api.force_authenticate(user=manager)
    assert api.post(f"/api/v1/sales-orders/{created.data['id']}/confirm/").status_code == 403
    assert api.get("/api/v1/sales-orders/").status_code == 200
    api.force_authenticate(user=staff)
    assert api.get("/api/v1/sales-orders/").status_code == 403
    api.force_authenticate(user=viewer)
    assert api.get("/api/v1/sales-orders/").status_code == 200
    assert api.get("/api/v1/sales-returns/").status_code == 200


@pytest.mark.django_db(transaction=True)
def test_concurrent_complete_deducts_stock_once(catalog):
    seller = user_with_role("seller", "Sales Staff", catalog["main"])
    row = stock(catalog, Decimal("10.000"))
    order = SalesOrder.objects.create(
        number="SO-000099",
        warehouse=catalog["main"],
        customer_name="Ada Lovelace",
        created_by=seller,
        status=SalesOrder.Status.CONFIRMED,
    )
    order.items.create(
        product=catalog["bolt"],
        quantity=Decimal("4.000"),
        unit_price=Decimal("2.50"),
        line_total=Decimal("10.00"),
    )
    row.reserved = Decimal("4.000")
    row.save(update_fields=["reserved", "updated_at"])
    results = []

    def worker():
        try:
            complete_sales_order(order=order, user=seller)
            results.append("ok")
        except BusinessRuleError:
            results.append("conflict")
        finally:
            connection.close()

    threads = [Thread(target=worker), Thread(target=worker)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=20)
        assert not thread.is_alive()

    assert sorted(results) == ["conflict", "ok"]
    row.refresh_from_db()
    assert row.on_hand == Decimal("6.000")
    assert row.reserved == Decimal("0.000")
    assert InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.SALE).count() == 1
    assert SalesOrder.objects.get(pk=order.pk).status == SalesOrder.Status.COMPLETED

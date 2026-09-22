from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db.models import Sum
from rest_framework.test import APIClient

from apps.accounts.models import User, UserWarehouse
from apps.audit.models import AuditLog
from apps.catalog.models import Category, Product
from apps.inventory.models import InventoryTransaction, StockLevel
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceipt
from apps.purchasing.services import receive_purchase_order
from apps.suppliers.models import Supplier
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
    supplier = Supplier.objects.create(name="Acme", code="ACME")
    main = Warehouse.objects.create(name="Main", code="MAIN")
    other = Warehouse.objects.create(name="Other", code="OTHER")
    return {"bolt": bolt, "supplier": supplier, "main": main, "other": other}


def user_with_role(username, role, *warehouses):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password=PASSWORD)
    user.groups.add(Group.objects.get(name=role))
    for warehouse in warehouses:
        UserWarehouse.objects.create(user=user, warehouse=warehouse)
    return user


def order_body(catalog, quantity="10.000", warehouse=None):
    return {
        "supplier": catalog["supplier"].pk,
        "warehouse": (warehouse or catalog["main"]).pk,
        "items": [
            {"product": catalog["bolt"].pk, "quantity_ordered": quantity, "unit_cost": "1.25"},
        ],
    }


def create_order(api, catalog, **kwargs):
    return api.post("/api/v1/purchase-orders/", order_body(catalog, **kwargs), format="json")


@pytest.mark.django_db
def test_partial_then_full_receive_posts_purchase_ledger(api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    api.force_authenticate(user=manager)
    created = create_order(api, catalog)
    assert created.status_code == 201
    assert created.data["number"] == "PO-000001"
    assert created.data["status"] == "DRAFT"
    assert created.data["total"] == "12.50"
    assert created.data["items"][0]["line_total"] == "12.50"
    order_id = created.data["id"]
    item_id = created.data["items"][0]["id"]

    edited = api.patch(f"/api/v1/purchase-orders/{order_id}/", {"notes": "Rush"}, format="json")
    assert edited.status_code == 200
    assert edited.data["notes"] == "Rush"

    submitted = api.post(f"/api/v1/purchase-orders/{order_id}/submit/")
    assert submitted.status_code == 200
    locked = api.patch(f"/api/v1/purchase-orders/{order_id}/", {"notes": "Too late"}, format="json")
    assert locked.status_code == 409
    assert locked.data["code"] == "business_rule"

    approved = api.post(f"/api/v1/purchase-orders/{order_id}/approve/")
    assert approved.status_code == 200
    assert approved.data["status"] == "APPROVED"
    assert api.get("/api/v1/purchase-orders/?status=APPROVED").data["count"] == 1

    over = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "11.000"}]},
        format="json",
    )
    assert over.status_code == 409
    assert over.data["code"] == "business_rule"
    assert PurchaseOrderItem.objects.get(pk=item_id).quantity_received == Decimal("0.000")
    assert not StockLevel.objects.exists()

    first = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "4.000"}]},
        format="json",
        HTTP_IDEMPOTENCY_KEY="recv-1",
    )
    assert first.status_code == 201
    assert first.data["number"] == "PRC-000001"
    replay = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "4.000"}]},
        format="json",
        HTTP_IDEMPOTENCY_KEY="recv-1",
    )
    assert replay.status_code == 200
    assert replay.data["id"] == first.data["id"]

    partial = api.get(f"/api/v1/purchase-orders/{order_id}/")
    assert partial.data["status"] == "PARTIALLY_RECEIVED"
    assert partial.data["items"][0]["quantity_received"] == "4.000"
    assert StockLevel.objects.get().on_hand == Decimal("4.000")

    second = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "6.000"}]},
        format="json",
    )
    assert second.status_code == 201
    finished = api.get(f"/api/v1/purchase-orders/{order_id}/")
    assert finished.data["status"] == "RECEIVED"
    stock = StockLevel.objects.get()
    assert stock.on_hand == Decimal("10.000")
    total = InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.PURCHASE).aggregate(
        total=Sum("quantity_change")
    )["total"]
    assert total == stock.on_hand
    assert AuditLog.objects.filter(action=AuditLog.Action.RECEIVE).count() == 2
    assert AuditLog.objects.filter(action=AuditLog.Action.STATUS_CHANGE).exists()

    extra = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "1.000"}]},
        format="json",
    )
    assert extra.status_code == 409
    stock.refresh_from_db()
    assert stock.on_hand == Decimal("10.000")
    blocked = api.post(f"/api/v1/purchase-orders/{order_id}/cancel/")
    assert blocked.status_code == 409
    assert PurchaseReceipt.objects.count() == 2


@pytest.mark.django_db
def test_illegal_purchase_order_transitions(api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    api.force_authenticate(user=manager)
    created = create_order(api, catalog)
    order_id = created.data["id"]
    item_id = created.data["items"][0]["id"]

    approve = api.post(f"/api/v1/purchase-orders/{order_id}/approve/")
    assert approve.status_code == 409
    receive = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "1.000"}]},
        format="json",
    )
    assert receive.status_code == 409
    assert not StockLevel.objects.exists()

    api.post(f"/api/v1/purchase-orders/{order_id}/submit/")
    again = api.post(f"/api/v1/purchase-orders/{order_id}/submit/")
    assert again.status_code == 409
    cancelled = api.post(f"/api/v1/purchase-orders/{order_id}/cancel/")
    assert cancelled.status_code == 200
    assert cancelled.data["status"] == "CANCELLED"
    assert api.post(f"/api/v1/purchase-orders/{order_id}/cancel/").status_code == 409

    hidden = api.post("/api/v1/purchase-orders/", order_body(catalog, warehouse=catalog["other"]), format="json")
    assert hidden.status_code == 404


@pytest.mark.django_db
def test_failed_receive_leaves_stock_and_order_unchanged(monkeypatch, api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    api.force_authenticate(user=manager)
    created = create_order(api, catalog)
    order_id = created.data["id"]
    item_id = created.data["items"][0]["id"]
    api.post(f"/api/v1/purchase-orders/{order_id}/submit/")
    api.post(f"/api/v1/purchase-orders/{order_id}/approve/")

    real_create = InventoryTransaction.objects.create

    def create(*args, **kwargs):
        if kwargs.get("transaction_type") == InventoryTransaction.Type.PURCHASE:
            raise RuntimeError("ledger failed")
        return real_create(*args, **kwargs)

    monkeypatch.setattr(InventoryTransaction.objects, "create", create)
    with pytest.raises(RuntimeError, match="ledger failed"):
        receive_purchase_order(
            order=PurchaseOrder.objects.get(pk=order_id),
            items=[{"item_id": item_id, "quantity": Decimal("4.000")}],
            user=manager,
        )

    assert PurchaseOrder.objects.get(pk=order_id).status == PurchaseOrder.Status.APPROVED
    assert PurchaseOrderItem.objects.get(pk=item_id).quantity_received == Decimal("0.000")
    assert not StockLevel.objects.exists()
    assert not PurchaseReceipt.objects.exists()
    assert not InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.PURCHASE).exists()


@pytest.mark.django_db
def test_inventory_staff_can_receive_but_cannot_approve(api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    sales = user_with_role("sales", "Sales Staff", catalog["main"])
    api.force_authenticate(user=manager)
    created = create_order(api, catalog)
    order_id = created.data["id"]
    item_id = created.data["items"][0]["id"]
    api.post(f"/api/v1/purchase-orders/{order_id}/submit/")

    api.force_authenticate(user=staff)
    assert api.post(f"/api/v1/purchase-orders/{order_id}/approve/").status_code == 403
    api.force_authenticate(user=sales)
    assert api.post("/api/v1/purchase-orders/", order_body(catalog), format="json").status_code == 403

    api.force_authenticate(user=manager)
    api.post(f"/api/v1/purchase-orders/{order_id}/approve/")
    api.force_authenticate(user=staff)
    received = api.post(
        f"/api/v1/purchase-orders/{order_id}/receive/",
        {"items": [{"item_id": item_id, "quantity": "10.000"}]},
        format="json",
    )
    assert received.status_code == 201
    assert api.get(f"/api/v1/purchase-orders/{order_id}/").data["status"] == "RECEIVED"
    assert api.get("/api/v1/purchase-receipts/").data["count"] == 1

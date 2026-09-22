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
        reorder_level=Decimal("5.000"),
    )
    nut = Product.objects.create(
        sku="NUT",
        name="Nut",
        category=category,
        cost_price=Decimal("0.40"),
        selling_price=Decimal("1.00"),
    )
    main = Warehouse.objects.create(name="Main", code="MAIN")
    other = Warehouse.objects.create(name="Other", code="OTHER")
    return {"category": category, "bolt": bolt, "nut": nut, "main": main, "other": other}


def user_with_role(username, role, warehouse=None):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=PASSWORD,
    )
    user.groups.add(Group.objects.get(name=role))
    if warehouse is not None:
        UserWarehouse.objects.create(user=user, warehouse=warehouse)
    return user


def receive(api, warehouse, lines, key=None):
    headers = {}
    if key:
        headers["HTTP_IDEMPOTENCY_KEY"] = key
    return api.post(
        "/api/v1/stock-receipts/",
        {
            "warehouse": warehouse.pk,
            "note": "Opening stock",
            "items": lines,
        },
        format="json",
        **headers,
    )


@pytest.mark.django_db
def test_receive_posts_stock_ledger_and_is_idempotent(api, catalog):
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    api.force_authenticate(user=staff)
    bolt = catalog["bolt"]
    nut = catalog["nut"]

    first = receive(
        api,
        catalog["main"],
        [
            {"product": bolt.pk, "quantity": "10.000", "unit_cost": "1.25"},
            {"product": nut.pk, "quantity": "4.000", "unit_cost": "0.40"},
        ],
        key="receipt-1",
    )
    assert first.status_code == 201
    body = first.json()
    assert body["number"] == "RCP-000001"
    assert {item["transaction"] for item in body["items"]}
    bolt_line = next(item for item in body["items"] if item["product"] == bolt.pk)
    assert Decimal(bolt_line["quantity"]) == Decimal("10.000")

    replay = receive(
        api,
        catalog["main"],
        [{"product": bolt.pk, "quantity": "10.000", "unit_cost": "1.25"}],
        key="receipt-1",
    )
    assert replay.status_code == 200
    assert replay.json()["id"] == body["id"]

    stock = StockLevel.objects.get(product=bolt, warehouse=catalog["main"])
    assert stock.on_hand == Decimal("10.000")
    assert stock.reserved == Decimal("0.000")
    movement = InventoryTransaction.objects.get(product=bolt, warehouse=catalog["main"])
    assert movement.balance_after == Decimal("10.000")
    assert movement.created_by == staff
    assert movement.transaction_type == InventoryTransaction.Type.RECEIPT
    total = InventoryTransaction.objects.filter(product=bolt, warehouse=catalog["main"]).aggregate(
        total=Sum("quantity_change")
    )["total"]
    assert total == stock.on_hand
    assert AuditLog.objects.filter(action=AuditLog.Action.RECEIVE, entity_id=str(body["id"])).count() == 1

    second = receive(
        api,
        catalog["main"],
        [{"product": bolt.pk, "quantity": "3.000", "unit_cost": "1.25"}],
    )
    assert second.status_code == 201
    stock.refresh_from_db()
    assert stock.on_hand == Decimal("13.000")
    assert InventoryTransaction.objects.filter(product=bolt).aggregate(total=Sum("quantity_change"))["total"] == stock.on_hand

    listed = api.get("/api/v1/stock/", {"product": bolt.pk})
    assert listed.status_code == 200
    assert listed.json()["results"][0]["status"] == "IN_STOCK"
    assert Decimal(listed.json()["results"][0]["available"]) == Decimal("13.000")

    low_product = Product.objects.get(pk=bolt.pk)
    low_product.reorder_level = Decimal("20.000")
    low_product.save(update_fields=["reorder_level"])
    assert api.get("/api/v1/stock/", {"status": "LOW"}).json()["count"] == 1


@pytest.mark.django_db
def test_receive_rejects_invalid_lines_without_changing_stock(api, catalog):
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    api.force_authenticate(user=staff)
    response = receive(
        api,
        catalog["main"],
        [{"product": catalog["bolt"].pk, "quantity": "0", "unit_cost": "1.00"}],
    )
    assert response.status_code == 400
    assert StockLevel.objects.count() == 0

    catalog["bolt"].is_active = False
    catalog["bolt"].save(update_fields=["is_active"])
    inactive = receive(
        api,
        catalog["main"],
        [{"product": catalog["bolt"].pk, "quantity": "1", "unit_cost": "1.00"}],
    )
    assert inactive.status_code == 400
    assert StockLevel.objects.count() == 0


@pytest.mark.django_db
def test_receive_permissions_and_warehouse_scope(api, catalog):
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    sales = user_with_role("sales", "Sales Staff", catalog["main"])
    viewer = user_with_role("viewer", "Viewer", catalog["main"])

    api.force_authenticate(user=sales)
    denied = receive(
        api,
        catalog["main"],
        [{"product": catalog["bolt"].pk, "quantity": "2", "unit_cost": "1.00"}],
    )
    assert denied.status_code == 403

    api.force_authenticate(user=staff)
    hidden = receive(
        api,
        catalog["other"],
        [{"product": catalog["bolt"].pk, "quantity": "2", "unit_cost": "1.00"}],
    )
    assert hidden.status_code == 404
    assert StockLevel.objects.count() == 0

    posted = receive(
        api,
        catalog["main"],
        [{"product": catalog["bolt"].pk, "quantity": "2", "unit_cost": "1.00"}],
    )
    assert posted.status_code == 201

    api.force_authenticate(user=viewer)
    assert api.post("/api/v1/stock-receipts/", {}, format="json").status_code == 403
    visible = api.get("/api/v1/warehouses/%s/stock/" % catalog["main"].pk)
    assert visible.status_code == 200
    assert visible.json()["count"] == 1
    assert api.get("/api/v1/warehouses/%s/stock/" % catalog["other"].pk).status_code == 404
    assert api.get("/api/v1/inventory-transactions/").json()["count"] == 1

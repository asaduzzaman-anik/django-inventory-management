from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.db.models import Sum
from rest_framework.test import APIClient

from apps.accounts.models import User, UserWarehouse
from apps.audit.models import AuditLog
from apps.catalog.models import Category, Product
from apps.inventory.models import InventoryTransaction, StockAdjustment, StockLevel, StockTransfer
from apps.inventory.services import transfer_stock
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
    main = Warehouse.objects.create(name="Main", code="MAIN")
    other = Warehouse.objects.create(name="Other", code="OTHER")
    return {"bolt": bolt, "main": main, "other": other}


def user_with_role(username, role, *warehouses):
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password=PASSWORD,
    )
    user.groups.add(Group.objects.get(name=role))
    for warehouse in warehouses:
        UserWarehouse.objects.create(user=user, warehouse=warehouse)
    return user


def receive(api, warehouse, product, quantity):
    return api.post(
        "/api/v1/stock-receipts/",
        {
            "warehouse": warehouse.pk,
            "items": [{"product": product.pk, "quantity": str(quantity), "unit_cost": "1.25"}],
        },
        format="json",
    )


def reserve(product, warehouse, quantity):
    stock = StockLevel.objects.get(product=product, warehouse=warehouse)
    stock.reserved = quantity
    stock.save(update_fields=["reserved", "updated_at"])
    return stock


@pytest.mark.django_db
def test_transfer_moves_available_stock_and_writes_paired_ledger_rows(api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"], catalog["other"])
    api.force_authenticate(user=manager)
    receive(api, catalog["main"], catalog["bolt"], "10.000")
    reserve(catalog["bolt"], catalog["main"], Decimal("4.000"))

    response = api.post(
        "/api/v1/stock-transfers/",
        {
            "source_warehouse": catalog["main"].pk,
            "destination_warehouse": catalog["other"].pk,
            "items": [{"product": catalog["bolt"].pk, "quantity": "6.000"}],
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.data["number"] == "TRF-000001"
    source = StockLevel.objects.get(product=catalog["bolt"], warehouse=catalog["main"])
    destination = StockLevel.objects.get(product=catalog["bolt"], warehouse=catalog["other"])
    assert source.on_hand == Decimal("4.000")
    assert source.reserved == Decimal("4.000")
    assert destination.on_hand == Decimal("6.000")
    assert destination.reserved == Decimal("0.000")
    for warehouse, expected in ((catalog["main"], Decimal("4.000")), (catalog["other"], Decimal("6.000"))):
        total = InventoryTransaction.objects.filter(product=catalog["bolt"], warehouse=warehouse).aggregate(
            total=Sum("quantity_change")
        )["total"]
        assert total == expected
    assert AuditLog.objects.filter(action=AuditLog.Action.TRANSFER).exists()


@pytest.mark.django_db
def test_transfer_rejects_reserved_stock_same_warehouse_and_out_of_scope(api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"], catalog["other"])
    api.force_authenticate(user=manager)
    receive(api, catalog["main"], catalog["bolt"], "10.000")
    reserve(catalog["bolt"], catalog["main"], Decimal("4.000"))

    insufficient = api.post(
        "/api/v1/stock-transfers/",
        {
            "source_warehouse": catalog["main"].pk,
            "destination_warehouse": catalog["other"].pk,
            "items": [{"product": catalog["bolt"].pk, "quantity": "7.000"}],
        },
        format="json",
    )
    assert insufficient.status_code == 409
    assert insufficient.data["code"] == "business_rule"
    source = StockLevel.objects.get(product=catalog["bolt"], warehouse=catalog["main"])
    assert source.on_hand == Decimal("10.000")
    assert not StockTransfer.objects.exists()

    same = api.post(
        "/api/v1/stock-transfers/",
        {
            "source_warehouse": catalog["main"].pk,
            "destination_warehouse": catalog["main"].pk,
            "items": [{"product": catalog["bolt"].pk, "quantity": "1.000"}],
        },
        format="json",
    )
    assert same.status_code == 400
    assert "destination_warehouse" in same.data["errors"]

    limited = user_with_role("limited", "Warehouse Manager", catalog["main"])
    api.force_authenticate(user=limited)
    hidden = api.post(
        "/api/v1/stock-transfers/",
        {
            "source_warehouse": catalog["main"].pk,
            "destination_warehouse": catalog["other"].pk,
            "items": [{"product": catalog["bolt"].pk, "quantity": "1.000"}],
        },
        format="json",
    )
    assert hidden.status_code == 404


@pytest.mark.django_db
def test_transfer_rolls_back_when_destination_ledger_fails(monkeypatch, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"], catalog["other"])
    StockLevel.objects.create(
        product=catalog["bolt"],
        warehouse=catalog["main"],
        on_hand=Decimal("10.000"),
        reserved=Decimal("4.000"),
    )
    real_create = InventoryTransaction.objects.create

    def create(*args, **kwargs):
        if kwargs.get("transaction_type") == InventoryTransaction.Type.TRANSFER_IN:
            raise RuntimeError("destination failed")
        return real_create(*args, **kwargs)

    monkeypatch.setattr(InventoryTransaction.objects, "create", create)

    with pytest.raises(RuntimeError, match="destination failed"):
        transfer_stock(
            source=catalog["main"],
            destination=catalog["other"],
            items=[{"product": catalog["bolt"], "quantity": Decimal("4.000")}],
            user=manager,
        )

    source = StockLevel.objects.get(product=catalog["bolt"], warehouse=catalog["main"])
    assert source.on_hand == Decimal("10.000")
    assert source.reserved == Decimal("4.000")
    assert not StockLevel.objects.filter(product=catalog["bolt"], warehouse=catalog["other"]).exists()
    assert not StockTransfer.objects.exists()
    assert not InventoryTransaction.objects.filter(
        transaction_type__in=[
            InventoryTransaction.Type.TRANSFER_OUT,
            InventoryTransaction.Type.TRANSFER_IN,
        ]
    ).exists()


@pytest.mark.django_db
def test_adjustment_respects_reserved_stock_and_reason_rules(api, catalog):
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    api.force_authenticate(user=manager)
    receive(api, catalog["main"], catalog["bolt"], "10.000")
    reserve(catalog["bolt"], catalog["main"], Decimal("4.000"))

    too_low = api.post(
        "/api/v1/stock-adjustments/",
        {
            "warehouse": catalog["main"].pk,
            "product": catalog["bolt"].pk,
            "quantity_change": "-7.000",
            "reason": "DAMAGED",
        },
        format="json",
    )
    assert too_low.status_code == 409
    assert too_low.data["code"] == "business_rule"
    stock = StockLevel.objects.get(product=catalog["bolt"], warehouse=catalog["main"])
    assert stock.on_hand == Decimal("10.000")

    missing_note = api.post(
        "/api/v1/stock-adjustments/",
        {
            "warehouse": catalog["main"].pk,
            "product": catalog["bolt"].pk,
            "quantity_change": "-1.000",
            "reason": "OTHER",
        },
        format="json",
    )
    assert missing_note.status_code == 400
    assert "note" in missing_note.data["errors"]

    adjusted = api.post(
        "/api/v1/stock-adjustments/",
        {
            "warehouse": catalog["main"].pk,
            "product": catalog["bolt"].pk,
            "quantity_change": "-6.000",
            "reason": "LOST",
        },
        format="json",
    )
    assert adjusted.status_code == 201
    assert adjusted.data["number"] == "ADJ-000001"
    stock.refresh_from_db()
    assert stock.on_hand == Decimal("4.000")
    assert stock.reserved == Decimal("4.000")
    movement = InventoryTransaction.objects.get(transaction_type=InventoryTransaction.Type.ADJUSTMENT_OUT)
    assert movement.quantity_change == Decimal("-6.000")
    assert movement.balance_after == Decimal("4.000")
    assert StockAdjustment.objects.get().transaction_id == movement.pk
    assert AuditLog.objects.filter(action=AuditLog.Action.ADJUST).exists()

    found = api.post(
        "/api/v1/stock-adjustments/",
        {
            "warehouse": catalog["main"].pk,
            "product": catalog["bolt"].pk,
            "quantity_change": "2.000",
            "reason": "FOUND",
        },
        format="json",
    )
    assert found.status_code == 201
    assert InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.ADJUSTMENT_IN).exists()


@pytest.mark.django_db
def test_staff_and_viewer_cannot_transfer_or_adjust(api, catalog):
    staff = user_with_role("staff", "Inventory Staff", catalog["main"], catalog["other"])
    api.force_authenticate(user=staff)
    transfer = api.post(
        "/api/v1/stock-transfers/",
        {
            "source_warehouse": catalog["main"].pk,
            "destination_warehouse": catalog["other"].pk,
            "items": [{"product": catalog["bolt"].pk, "quantity": "1.000"}],
        },
        format="json",
    )
    adjustment = api.post(
        "/api/v1/stock-adjustments/",
        {
            "warehouse": catalog["main"].pk,
            "product": catalog["bolt"].pk,
            "quantity_change": "1.000",
            "reason": "FOUND",
        },
        format="json",
    )
    assert transfer.status_code == 403
    assert adjustment.status_code == 403

    viewer = user_with_role("viewer", "Viewer", catalog["main"])
    api.force_authenticate(user=viewer)
    assert api.get("/api/v1/stock-transfers/").status_code == 200
    assert api.get("/api/v1/stock-adjustments/").status_code == 200

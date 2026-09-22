from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.core import mail
from django.core.management import call_command
from django.test.utils import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User, UserWarehouse
from apps.audit.models import AuditLog
from apps.catalog.models import Category, Product
from apps.inventory.models import InventoryTransaction, StockLevel
from apps.reports.services import invalidate_dashboard_cache
from apps.reports.tasks import generate_scheduled_movement_report
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
        cost_price=Decimal("5.00"),
        selling_price=Decimal("2.50"),
        reorder_level=Decimal("0.000"),
    )
    main = Warehouse.objects.create(name="Main", code="MAIN")
    return {"bolt": bolt, "main": main}


def user_with_role(username, role, warehouse=None, superuser=False):
    email = f"{username}@example.com"
    if superuser:
        user = User.objects.create_superuser(username=username, email=email, password=PASSWORD)
    else:
        user = User.objects.create_user(username=username, email=email, password=PASSWORD)
    user.groups.add(Group.objects.get(name=role))
    if warehouse is not None:
        UserWarehouse.objects.create(user=user, warehouse=warehouse)
    return user


def window(days):
    now = timezone.now()
    return {
        "created_after": (now - timedelta(days=days)).date().isoformat(),
        "created_before": (now + timedelta(days=1)).date().isoformat(),
    }


def quantity_sum(response):
    return sum(Decimal(row["quantity_change"]) for row in response.data["results"])


@pytest.mark.django_db
def test_dashboard_and_movement_totals_match_a_receive_and_sale(api, catalog):
    boss = user_with_role("boss", "Super Admin", superuser=True)
    viewer = user_with_role("viewer", "Viewer", catalog["main"])
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    api.force_authenticate(user=boss)
    received = api.post(
        "/api/v1/stock-receipts/",
        {
            "warehouse": catalog["main"].pk,
            "items": [{"product": catalog["bolt"].pk, "quantity": "10.000", "unit_cost": "5.00"}],
        },
        format="json",
    )
    assert received.status_code == 201
    order = api.post(
        "/api/v1/sales-orders/",
        {
            "warehouse": catalog["main"].pk,
            "customer_name": "Ada Lovelace",
            "items": [{"product": catalog["bolt"].pk, "quantity": "2.000"}],
        },
        format="json",
    )
    assert order.status_code == 201
    assert api.post(f"/api/v1/sales-orders/{order.data['id']}/confirm/").status_code == 200
    assert api.post(f"/api/v1/sales-orders/{order.data['id']}/complete/").status_code == 200

    api.force_authenticate(user=viewer)
    dashboard = api.get("/api/v1/dashboard/")
    assert dashboard.status_code == 200
    assert dashboard.data["inventory_value"] == "40.00"
    assert dashboard.data["sales_total_30_days"] == "5.00"
    assert dashboard.data["stock_value_by_warehouse"][0]["value"] == "40.00"
    assert sum(Decimal(row["quantity"]) for row in dashboard.data["daily_movements"]) == Decimal("8.000")

    movements = api.get("/api/v1/reports/stock-movements/", window(30))
    assert movements.status_code == 200
    assert quantity_sum(movements) == Decimal("8.000")
    inventory = api.get("/api/v1/reports/inventory/")
    assert inventory.data["results"][0]["on_hand"] == "8.000"
    assert inventory.data["results"][0]["value"] == "40.00"
    performance = api.get("/api/v1/reports/product-performance/")
    assert performance.data["results"][0]["quantity_sold"] == "2.000"
    assert performance.data["results"][0]["revenue"] == "5.00"

    InventoryTransaction.objects.filter(transaction_type=InventoryTransaction.Type.RECEIPT).update(
        created_at=timezone.now() - timedelta(days=20)
    )
    recent = api.get("/api/v1/reports/stock-movements/", window(2))
    assert quantity_sum(recent) == Decimal("-2.000")
    assert api.get("/api/v1/reports/stock-movements/").status_code == 400
    too_wide = {
        "created_after": (timezone.now() - timedelta(days=400)).date().isoformat(),
        "created_before": timezone.now().date().isoformat(),
    }
    assert api.get("/api/v1/reports/purchases/", too_wide).status_code == 400
    assert api.get("/api/v1/reports/sales/", window(30)).data["results"][0]["quantity"] == "2.000"
    assert api.get("/api/v1/reports/inventory/export/", {"format": "csv"}).status_code == 403

    api.force_authenticate(user=manager)
    exported = api.get("/api/v1/reports/inventory/export/", {"format": "csv"})
    assert exported.status_code == 200
    assert b"BOLT" in exported.content
    workbook = api.get("/api/v1/reports/inventory/export/", {"format": "xlsx"})
    assert workbook.status_code == 200
    assert workbook.content[:2] == b"PK"
    assert AuditLog.objects.filter(action=AuditLog.Action.CREATE, entity_repr="inventory").exists()

    cached = api.get("/api/v1/dashboard/").data["inventory_value"]
    StockLevel.objects.filter(product=catalog["bolt"]).update(on_hand=Decimal("1.000"))
    assert api.get("/api/v1/dashboard/").data["inventory_value"] == cached
    invalidate_dashboard_cache()
    assert api.get("/api/v1/dashboard/").data["inventory_value"] == "5.00"


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
@pytest.mark.django_db
def test_weekly_movement_report_emails_super_admins(catalog):
    user_with_role("boss", "Super Admin", superuser=True)
    generate_scheduled_movement_report()
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["boss@example.com"]
    assert mail.outbox[0].attachments

from decimal import Decimal

import pytest
from django.contrib.auth.models import Group
from django.core import mail
from django.core.management import call_command
from django.test.utils import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User, UserWarehouse
from apps.catalog.models import Category, Product
from apps.inventory.models import StockLevel
from apps.notifications.models import Notification, StockAlertState
from apps.notifications.services import evaluate_stock_level, scan_all_stock
from apps.notifications.tasks import send_notification_email
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
        reorder_level=Decimal("5.000"),
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


def run_alert_now(product_id, warehouse_id):
    evaluate_stock_level(product_id, warehouse_id)


@pytest.mark.django_db
def test_low_stock_notifies_once_until_stock_recovers(monkeypatch, api, catalog, django_capture_on_commit_callbacks):
    monkeypatch.setattr("apps.notifications.tasks.evaluate_stock_alert.delay", run_alert_now)
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"])
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    api.force_authenticate(user=staff)

    with django_capture_on_commit_callbacks(execute=True):
        response = api.post(
            "/api/v1/stock-receipts/",
            {
                "warehouse": catalog["main"].pk,
                "items": [{"product": catalog["bolt"].pk, "quantity": "3.000", "unit_cost": "1.25"}],
            },
            format="json",
        )
    assert response.status_code == 201
    assert Notification.objects.filter(recipient=manager, category=Notification.Category.LOW_STOCK).count() == 1
    assert StockAlertState.objects.count() == 1

    evaluate_stock_level(catalog["bolt"].pk, catalog["main"].pk)
    scan_all_stock()
    assert Notification.objects.filter(category=Notification.Category.LOW_STOCK).count() == 1

    row = StockLevel.objects.get(product=catalog["bolt"], warehouse=catalog["main"])
    row.on_hand = Decimal("20.000")
    row.save(update_fields=["on_hand", "updated_at"])
    evaluate_stock_level(catalog["bolt"].pk, catalog["main"].pk)
    assert not StockAlertState.objects.exists()

    row.on_hand = Decimal("2.000")
    row.save(update_fields=["on_hand", "updated_at"])
    evaluate_stock_level(catalog["bolt"].pk, catalog["main"].pk)
    assert Notification.objects.filter(category=Notification.Category.LOW_STOCK).count() == 2


@pytest.mark.django_db
def test_receipt_commits_when_alert_enqueue_fails(monkeypatch, api, catalog, django_capture_on_commit_callbacks):
    def boom(*args, **kwargs):
        raise ConnectionError("redis down")

    monkeypatch.setattr("apps.notifications.tasks.evaluate_stock_alert.delay", boom)
    staff = user_with_role("staff", "Inventory Staff", catalog["main"])
    api.force_authenticate(user=staff)

    with django_capture_on_commit_callbacks(execute=True):
        response = api.post(
            "/api/v1/stock-receipts/",
            {
                "warehouse": catalog["main"].pk,
                "items": [{"product": catalog["bolt"].pk, "quantity": "10.000", "unit_cost": "1.25"}],
            },
            format="json",
        )
    assert response.status_code == 201
    assert StockLevel.objects.get().on_hand == Decimal("10.000")
    assert Notification.objects.filter(category=Notification.Category.LOW_STOCK).count() == 0


@pytest.mark.django_db
def test_purchase_transfer_and_adjustment_notify_after_commit(
    monkeypatch, api, catalog, django_capture_on_commit_callbacks
):
    monkeypatch.setattr("apps.notifications.tasks.evaluate_stock_alert.delay", run_alert_now)
    manager = user_with_role("manager", "Warehouse Manager", catalog["main"], catalog["other"])
    api.force_authenticate(user=manager)
    StockLevel.objects.create(
        product=catalog["bolt"],
        warehouse=catalog["main"],
        on_hand=Decimal("8.000"),
        reserved=Decimal("0.000"),
    )

    with django_capture_on_commit_callbacks(execute=True):
        created = api.post(
            "/api/v1/purchase-orders/",
            {
                "supplier": catalog["supplier"].pk,
                "warehouse": catalog["main"].pk,
                "items": [{"product": catalog["bolt"].pk, "quantity_ordered": "4.000", "unit_cost": "1.25"}],
            },
            format="json",
        )
        api.post(f"/api/v1/purchase-orders/{created.data['id']}/submit/")
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
                "quantity_change": "-1.000",
                "reason": "DAMAGED",
            },
            format="json",
        )
    assert created.status_code == 201
    assert transfer.status_code == 201
    assert adjustment.status_code == 201
    assert Notification.objects.filter(recipient=manager, category=Notification.Category.PO_SUBMITTED).count() == 1
    assert Notification.objects.filter(recipient=manager, category=Notification.Category.TRANSFER_COMPLETED).count() == 1
    assert Notification.objects.filter(recipient=manager, category=Notification.Category.ADJUSTMENT).count() == 1


@pytest.mark.django_db
def test_notification_inbox_is_private(api, catalog):
    owner = user_with_role("owner", "Viewer", catalog["main"])
    other = user_with_role("other", "Viewer", catalog["main"])
    first = Notification.objects.create(
        recipient=owner,
        category=Notification.Category.ADJUSTMENT,
        title="One",
        body="First",
        entity_type="inventory.StockAdjustment",
        entity_id="1",
    )
    Notification.objects.create(
        recipient=owner,
        category=Notification.Category.ADJUSTMENT,
        title="Two",
        body="Second",
        entity_type="inventory.StockAdjustment",
        entity_id="2",
    )
    hidden = Notification.objects.create(
        recipient=other,
        category=Notification.Category.ADJUSTMENT,
        title="Hidden",
        body="Nope",
        entity_type="inventory.StockAdjustment",
        entity_id="3",
    )

    api.force_authenticate(user=owner)
    listed = api.get("/api/v1/notifications/")
    assert listed.status_code == 200
    assert listed.data["count"] == 2
    assert api.post(f"/api/v1/notifications/{hidden.pk}/read/").status_code == 404
    marked = api.post(f"/api/v1/notifications/{first.pk}/read/")
    assert marked.status_code == 200
    assert marked.data["read_at"] is not None
    cleared = api.post("/api/v1/notifications/read-all/")
    assert cleared.status_code == 200
    assert cleared.data["updated"] == 1
    assert Notification.objects.filter(recipient=owner, read_at__isnull=True).count() == 0
    assert Notification.objects.get(pk=hidden.pk).read_at is None

    api.force_authenticate(user=other)
    assert api.get("/api/v1/notifications/").data["count"] == 1


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
@pytest.mark.django_db
def test_notification_email_is_sent(catalog):
    owner = user_with_role("owner", "Viewer", catalog["main"])
    note = Notification.objects.create(
        recipient=owner,
        category=Notification.Category.LOW_STOCK,
        title="BOLT is low at MAIN",
        body="Available quantity is 3.000.",
        entity_type="inventory.StockLevel",
        entity_id="1",
    )
    send_notification_email(note.pk)
    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == "BOLT is low at MAIN"
    assert mail.outbox[0].to == [owner.email]

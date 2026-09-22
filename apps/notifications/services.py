import logging

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.inventory.services import stock_queryset
from apps.notifications.models import Notification, StockAlertState

logger = logging.getLogger(__name__)
User = get_user_model()


def operational_recipients(*warehouses):
    warehouse_ids = [warehouse.pk for warehouse in warehouses]
    manager_ids = User.objects.filter(
        is_active=True,
        groups__name="Warehouse Manager",
        warehouse_assignments__warehouse_id__in=warehouse_ids,
    ).values_list("pk", flat=True)
    admin_ids = User.objects.filter(is_active=True, groups__name="Super Admin").values_list("pk", flat=True)
    return User.objects.filter(pk__in=list(manager_ids) + list(admin_ids), is_active=True).distinct()


def create_notifications(*, recipients, category, title, body, entity_type, entity_id):
    created = []
    for user in recipients:
        note = Notification.objects.create(
            recipient=user,
            category=category,
            title=title,
            body=body,
            entity_type=entity_type,
            entity_id=str(entity_id),
        )
        created.append(note)
        if user.email:
            _enqueue_email(note.pk)
    return created


def enqueue_stock_alerts(pairs):
    unique = list({(product_id, warehouse_id) for product_id, warehouse_id in pairs})
    if not unique:
        return

    def _send(unique=unique):
        from apps.notifications.tasks import evaluate_stock_alert

        for product_id, warehouse_id in unique:
            try:
                evaluate_stock_alert.delay(product_id, warehouse_id)
            except Exception:
                logger.exception(
                    "Failed to enqueue stock alert for product %s warehouse %s",
                    product_id,
                    warehouse_id,
                )

    transaction.on_commit(_send)


def evaluate_stock_level(product_id, warehouse_id):
    stock = stock_queryset().filter(product_id=product_id, warehouse_id=warehouse_id).first()
    if stock is None:
        return
    if stock.status == "OUT":
        _open_alert(stock, StockAlertState.AlertType.OUT, Notification.Category.OUT_OF_STOCK)
        _clear_alert(product_id, warehouse_id, StockAlertState.AlertType.LOW)
    elif stock.status == "LOW":
        _open_alert(stock, StockAlertState.AlertType.LOW, Notification.Category.LOW_STOCK)
        _clear_alert(product_id, warehouse_id, StockAlertState.AlertType.OUT)
    else:
        StockAlertState.objects.filter(product_id=product_id, warehouse_id=warehouse_id).delete()


def scan_all_stock():
    for product_id, warehouse_id in stock_queryset().values_list("product_id", "warehouse_id"):
        evaluate_stock_level(product_id, warehouse_id)


def notify_transfer(transfer_id):
    from apps.inventory.models import StockTransfer

    document = StockTransfer.objects.select_related("source_warehouse", "destination_warehouse").get(pk=transfer_id)
    notify_document(
        warehouses=[document.source_warehouse, document.destination_warehouse],
        category=Notification.Category.TRANSFER_COMPLETED,
        title=f"{document.number} completed",
        body=f"Stock moved from {document.source_warehouse.code} to {document.destination_warehouse.code}.",
        entity_type="inventory.StockTransfer",
        entity_id=document.pk,
    )


def notify_adjustment(adjustment_id):
    from apps.inventory.models import StockAdjustment

    document = StockAdjustment.objects.select_related("warehouse", "product").get(pk=adjustment_id)
    notify_document(
        warehouses=[document.warehouse],
        category=Notification.Category.ADJUSTMENT,
        title=f"{document.number} posted",
        body=f"{document.product.sku} adjusted by {document.quantity_change} at {document.warehouse.code}.",
        entity_type="inventory.StockAdjustment",
        entity_id=document.pk,
    )


def notify_document(*, warehouses, category, title, body, entity_type, entity_id):
    create_notifications(
        recipients=operational_recipients(*warehouses),
        category=category,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
    )


def _open_alert(stock, alert_type, category):
    try:
        with transaction.atomic():
            StockAlertState.objects.create(
                product_id=stock.product_id,
                warehouse_id=stock.warehouse_id,
                alert_type=alert_type,
                last_notified_at=timezone.now(),
            )
    except IntegrityError:
        return
    label = "out of stock" if alert_type == StockAlertState.AlertType.OUT else "low"
    create_notifications(
        recipients=operational_recipients(stock.warehouse),
        category=category,
        title=f"{stock.product.sku} is {label} at {stock.warehouse.code}",
        body=f"Available quantity is {stock.available}.",
        entity_type="inventory.StockLevel",
        entity_id=stock.pk,
    )


def _clear_alert(product_id, warehouse_id, alert_type):
    StockAlertState.objects.filter(
        product_id=product_id,
        warehouse_id=warehouse_id,
        alert_type=alert_type,
    ).delete()


def _enqueue_email(notification_id):
    from apps.notifications.tasks import send_notification_email

    try:
        send_notification_email.delay(notification_id)
    except Exception:
        logger.exception("Failed to enqueue notification email %s", notification_id)

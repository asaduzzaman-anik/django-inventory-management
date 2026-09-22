from celery import shared_task
from django.core.mail import send_mail


@shared_task
def evaluate_stock_alert(product_id, warehouse_id):
    from apps.notifications.services import evaluate_stock_level

    evaluate_stock_level(product_id, warehouse_id)


@shared_task
def scan_low_stock():
    from apps.notifications.services import scan_all_stock

    scan_all_stock()


@shared_task
def send_notification_email(notification_id):
    from apps.notifications.models import Notification

    note = Notification.objects.select_related("recipient").filter(pk=notification_id).first()
    if note is None or not note.recipient.email:
        return
    send_mail(
        subject=note.title,
        message=note.body,
        from_email=None,
        recipient_list=[note.recipient.email],
        fail_silently=False,
    )

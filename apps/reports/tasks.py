from datetime import timedelta
from io import BytesIO

from celery import shared_task
from django.core.mail import EmailMessage
from django.utils import timezone
from openpyxl import Workbook

from apps.reports.services import movement_rows_between


@shared_task
def generate_scheduled_movement_report():
    from django.contrib.auth import get_user_model

    end = timezone.now()
    start = end - timedelta(days=7)
    rows = movement_rows_between(user=None, start=start, end=end)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Movements"
    sheet.append(["Created", "Type", "SKU", "Warehouse", "Quantity", "Balance"])
    for row in rows:
        sheet.append(
            [
                row["created_at"],
                row["transaction_type"],
                row["sku"],
                row["warehouse_code"],
                row["quantity_change"],
                row["balance_after"],
            ]
        )
    buffer = BytesIO()
    workbook.save(buffer)
    recipients = list(
        get_user_model()
        .objects.filter(is_active=True, groups__name="Super Admin")
        .exclude(email="")
        .values_list("email", flat=True)
    )
    if not recipients:
        return
    message = EmailMessage(
        subject="Weekly stock movement report",
        body="Movement totals for the last 7 days are attached.",
        to=recipients,
    )
    message.attach(
        "stock-movements.xlsx",
        buffer.getvalue(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    message.send()

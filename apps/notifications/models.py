from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Category(models.TextChoices):
        LOW_STOCK = "LOW_STOCK", "Low stock"
        OUT_OF_STOCK = "OUT_OF_STOCK", "Out of stock"
        PO_SUBMITTED = "PO_SUBMITTED", "Purchase order submitted"
        PO_APPROVED = "PO_APPROVED", "Purchase order approved"
        PO_RECEIVED = "PO_RECEIVED", "Purchase order received"
        TRANSFER_COMPLETED = "TRANSFER_COMPLETED", "Transfer completed"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="notifications",
    )
    category = models.CharField(max_length=32, choices=Category.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    entity_type = models.CharField(max_length=80, blank=True)
    entity_id = models.CharField(max_length=64, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "read_at", "created_at"]),
        ]

    def __str__(self):
        return self.title


class StockAlertState(models.Model):
    class AlertType(models.TextChoices):
        LOW = "LOW", "Low"
        OUT = "OUT", "Out"

    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="stock_alert_states")
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.PROTECT, related_name="stock_alert_states")
    alert_type = models.CharField(max_length=8, choices=AlertType.choices)
    last_notified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "warehouse", "alert_type"],
                name="unique_stock_alert_state",
            ),
        ]

    def __str__(self):
        return f"{self.alert_type} {self.product_id}@{self.warehouse_id}"

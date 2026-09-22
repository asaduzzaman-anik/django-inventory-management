from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q

from apps.common.models import TimeStampedModel


class PurchaseOrder(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted"
        APPROVED = "APPROVED", "Approved"
        PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED", "Partially received"
        RECEIVED = "RECEIVED", "Received"
        CANCELLED = "CANCELLED", "Cancelled"

    number = models.CharField(max_length=20, unique=True)
    supplier = models.ForeignKey("suppliers.Supplier", on_delete=models.PROTECT, related_name="purchase_orders")
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.PROTECT, related_name="purchase_orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="approved_purchase_orders",
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("submit_purchaseorder", "Can submit a purchase order"),
            ("approve_purchaseorder", "Can approve a purchase order"),
            ("receive_purchaseorder", "Can receive a purchase order"),
        ]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["warehouse", "status"]),
        ]

    def __str__(self):
        return self.number


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="purchase_order_items")
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(0)])
    quantity_received = models.DecimalField(max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    line_total = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["purchase_order", "product"], name="unique_purchase_order_product"),
            models.CheckConstraint(condition=Q(quantity_ordered__gt=0), name="po_item_quantity_ordered_gt_0"),
            models.CheckConstraint(condition=Q(quantity_received__gte=0), name="po_item_quantity_received_gte_0"),
            models.CheckConstraint(
                condition=Q(quantity_received__lte=F("quantity_ordered")),
                name="po_item_received_lte_ordered",
            ),
        ]

    def __str__(self):
        return f"{self.purchase_order.number} {self.product_id}"


class PurchaseReceipt(models.Model):
    number = models.CharField(max_length=20, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT, related_name="receipts")
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="purchase_receipts",
    )
    received_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return self.number


class PurchaseReceiptItem(models.Model):
    receipt = models.ForeignKey(PurchaseReceipt, on_delete=models.PROTECT, related_name="items")
    purchase_order_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.PROTECT, related_name="receipt_items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="purchase_receipt_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(0)])
    transaction = models.ForeignKey(
        "inventory.InventoryTransaction",
        on_delete=models.PROTECT,
        related_name="purchase_receipt_items",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["receipt", "purchase_order_item"], name="unique_purchase_receipt_line"),
        ]

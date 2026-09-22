from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q

from apps.common.models import TimeStampedModel


class StockLevel(TimeStampedModel):
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="stock_levels")
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.PROTECT, related_name="stock_levels")
    on_hand = models.DecimalField(max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    reserved = models.DecimalField(max_digits=12, decimal_places=3, default=0, validators=[MinValueValidator(0)])
    reorder_level = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "warehouse"], name="unique_stock_product_warehouse"),
            models.CheckConstraint(condition=Q(on_hand__gte=0), name="stocklevel_on_hand_gte_0"),
            models.CheckConstraint(condition=Q(reserved__gte=0), name="stocklevel_reserved_gte_0"),
            models.CheckConstraint(condition=Q(reserved__lte=F("on_hand")), name="stocklevel_reserved_lte_on_hand"),
        ]
        indexes = [
            models.Index(fields=["warehouse", "product"]),
        ]

    def __str__(self):
        return f"{self.product} @ {self.warehouse}"


class InventoryTransaction(models.Model):
    class Type(models.TextChoices):
        RECEIPT = "RECEIPT", "Receipt"
        PURCHASE = "PURCHASE", "Purchase"
        SALE = "SALE", "Sale"
        TRANSFER_IN = "TRANSFER_IN", "Transfer in"
        TRANSFER_OUT = "TRANSFER_OUT", "Transfer out"
        ADJUSTMENT_IN = "ADJUSTMENT_IN", "Adjustment in"
        ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Adjustment out"
        RETURN = "RETURN", "Return"

    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="inventory_transactions")
    warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="inventory_transactions",
    )
    transaction_type = models.CharField(max_length=20, choices=Type.choices)
    quantity_change = models.DecimalField(max_digits=12, decimal_places=3)
    balance_after = models.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    reference_type = models.CharField(max_length=40)
    reference_id = models.PositiveBigIntegerField()
    reference_code = models.CharField(max_length=40)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="inventory_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity_change__gt=0) | Q(quantity_change__lt=0),
                name="inventorytransaction_quantity_nonzero",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "warehouse", "created_at"]),
            models.Index(fields=["warehouse", "created_at"]),
            models.Index(fields=["transaction_type", "created_at"]),
            models.Index(fields=["reference_type", "reference_id"]),
        ]

    def __str__(self):
        return f"{self.transaction_type} {self.quantity_change} {self.product_id}"


class DocumentSequence(models.Model):
    prefix = models.CharField(max_length=8, unique=True)
    last_value = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.prefix


class StockReceipt(TimeStampedModel):
    number = models.CharField(max_length=20, unique=True)
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.PROTECT, related_name="stock_receipts")
    note = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_receipts",
    )

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("receive_stock", "Can receive stock"),
        ]

    def __str__(self):
        return self.number


class StockReceiptItem(models.Model):
    receipt = models.ForeignKey(StockReceipt, on_delete=models.PROTECT, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="receipt_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(0)])
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    transaction = models.ForeignKey(
        InventoryTransaction,
        on_delete=models.PROTECT,
        related_name="receipt_items",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["receipt", "product"], name="unique_receipt_product"),
        ]


class StockTransfer(TimeStampedModel):
    number = models.CharField(max_length=20, unique=True)
    source_warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="transfers_out",
    )
    destination_warehouse = models.ForeignKey(
        "warehouses.Warehouse",
        on_delete=models.PROTECT,
        related_name="transfers_in",
    )
    note = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_transfers",
    )

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("transfer_stock", "Can transfer stock"),
        ]

    def __str__(self):
        return self.number


class StockTransferItem(models.Model):
    transfer = models.ForeignKey(StockTransfer, on_delete=models.PROTECT, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="transfer_items")
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(0)])
    transaction_out = models.ForeignKey(
        InventoryTransaction,
        on_delete=models.PROTECT,
        related_name="transfer_items_out",
    )
    transaction_in = models.ForeignKey(
        InventoryTransaction,
        on_delete=models.PROTECT,
        related_name="transfer_items_in",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["transfer", "product"], name="unique_transfer_product"),
        ]


class StockAdjustment(TimeStampedModel):
    class Reason(models.TextChoices):
        DAMAGED = "DAMAGED", "Damaged"
        LOST = "LOST", "Lost"
        FOUND = "FOUND", "Found"
        CORRECTION = "CORRECTION", "Correction"
        EXPIRED = "EXPIRED", "Expired"
        OTHER = "OTHER", "Other"

    number = models.CharField(max_length=20, unique=True)
    warehouse = models.ForeignKey("warehouses.Warehouse", on_delete=models.PROTECT, related_name="stock_adjustments")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="stock_adjustments")
    quantity_change = models.DecimalField(max_digits=12, decimal_places=3)
    reason = models.CharField(max_length=20, choices=Reason.choices)
    note = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_adjustments",
    )
    transaction = models.ForeignKey(
        InventoryTransaction,
        on_delete=models.PROTECT,
        related_name="adjustments",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("adjust_stock", "Can adjust stock"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity_change__gt=0) | Q(quantity_change__lt=0),
                name="stockadjustment_quantity_nonzero",
            ),
        ]

    def __str__(self):
        return self.number

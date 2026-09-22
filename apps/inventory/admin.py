from django.contrib import admin

from apps.inventory.models import InventoryTransaction, StockAdjustment, StockLevel, StockReceipt, StockTransfer


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StockLevel)
class StockLevelAdmin(ReadOnlyAdmin):
    list_display = ("product", "warehouse", "on_hand", "reserved", "reorder_level")
    list_filter = ("warehouse",)


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(ReadOnlyAdmin):
    list_display = ("created_at", "transaction_type", "product", "warehouse", "quantity_change", "balance_after")
    list_filter = ("transaction_type", "warehouse")


@admin.register(StockReceipt)
class StockReceiptAdmin(ReadOnlyAdmin):
    list_display = ("number", "warehouse", "created_by", "created_at")


@admin.register(StockTransfer)
class StockTransferAdmin(ReadOnlyAdmin):
    list_display = ("number", "source_warehouse", "destination_warehouse", "created_by", "created_at")


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(ReadOnlyAdmin):
    list_display = ("number", "warehouse", "product", "quantity_change", "reason", "created_at")

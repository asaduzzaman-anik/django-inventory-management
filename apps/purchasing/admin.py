from django.contrib import admin

from apps.purchasing.models import PurchaseOrder, PurchaseReceipt


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(ReadOnlyAdmin):
    list_display = ("number", "supplier", "warehouse", "status", "total", "created_at")
    list_filter = ("status", "warehouse")


@admin.register(PurchaseReceipt)
class PurchaseReceiptAdmin(ReadOnlyAdmin):
    list_display = ("number", "purchase_order", "received_by", "received_at")

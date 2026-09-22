from django.contrib import admin

from apps.sales.models import SalesOrder, SalesReturn


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SalesOrder)
class SalesOrderAdmin(ReadOnlyAdmin):
    list_display = ("number", "customer_name", "warehouse", "status", "payment_status", "total", "created_at")
    list_filter = ("status", "payment_status", "warehouse")


@admin.register(SalesReturn)
class SalesReturnAdmin(ReadOnlyAdmin):
    list_display = ("number", "sales_order", "created_by", "created_at")

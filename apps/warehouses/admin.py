from django.contrib import admin

from apps.warehouses.models import Warehouse


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "city", "is_active")
    search_fields = ("code", "name")
    list_filter = ("is_active",)

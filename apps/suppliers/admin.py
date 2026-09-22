from django.contrib import admin

from apps.suppliers.models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "email", "is_active")
    search_fields = ("code", "name", "email")
    list_filter = ("is_active",)

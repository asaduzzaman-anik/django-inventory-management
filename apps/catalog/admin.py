from django.contrib import admin

from apps.catalog.models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent", "is_active")
    search_fields = ("name", "slug")
    list_filter = ("is_active",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "is_active")
    search_fields = ("sku", "name", "barcode")
    list_filter = ("is_active", "unit", "category")

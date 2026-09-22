import django_filters

from apps.catalog.models import Category, Product


class CategoryFilter(django_filters.FilterSet):
    class Meta:
        model = Category
        fields = ["is_active", "parent"]


class ProductFilter(django_filters.FilterSet):
    class Meta:
        model = Product
        fields = ["category", "is_active"]

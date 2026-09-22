import django_filters

from apps.inventory.models import InventoryTransaction, StockLevel


class StockLevelFilter(django_filters.FilterSet):
    warehouse = django_filters.NumberFilter(field_name="warehouse_id")
    product = django_filters.NumberFilter(field_name="product_id")
    category = django_filters.NumberFilter(field_name="product__category_id")
    status = django_filters.CharFilter(field_name="status")

    class Meta:
        model = StockLevel
        fields = ["warehouse", "product", "category"]


class InventoryTransactionFilter(django_filters.FilterSet):
    warehouse = django_filters.NumberFilter(field_name="warehouse_id")
    product = django_filters.NumberFilter(field_name="product_id")
    category = django_filters.NumberFilter(field_name="product__category_id")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = InventoryTransaction
        fields = ["warehouse", "product", "category", "transaction_type", "created_after", "created_before"]

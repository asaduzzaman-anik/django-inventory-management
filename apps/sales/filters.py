import django_filters

from apps.sales.models import SalesOrder, SalesReturn


class SalesOrderFilter(django_filters.FilterSet):
    warehouse = django_filters.NumberFilter(field_name="warehouse_id")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = SalesOrder
        fields = ["status", "payment_status", "warehouse", "created_after", "created_before"]


class SalesReturnFilter(django_filters.FilterSet):
    sales_order = django_filters.NumberFilter(field_name="sales_order_id")
    warehouse = django_filters.NumberFilter(field_name="sales_order__warehouse_id")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = SalesReturn
        fields = ["sales_order", "warehouse", "created_after", "created_before"]

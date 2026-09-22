import django_filters

from apps.purchasing.models import PurchaseOrder, PurchaseReceipt


class PurchaseOrderFilter(django_filters.FilterSet):
    supplier = django_filters.NumberFilter(field_name="supplier_id")
    warehouse = django_filters.NumberFilter(field_name="warehouse_id")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = PurchaseOrder
        fields = ["status", "supplier", "warehouse", "created_after", "created_before"]


class PurchaseReceiptFilter(django_filters.FilterSet):
    purchase_order = django_filters.NumberFilter(field_name="purchase_order_id")
    warehouse = django_filters.NumberFilter(field_name="purchase_order__warehouse_id")
    created_after = django_filters.DateTimeFilter(field_name="received_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="received_at", lookup_expr="lte")

    class Meta:
        model = PurchaseReceipt
        fields = ["purchase_order", "warehouse", "created_after", "created_before"]

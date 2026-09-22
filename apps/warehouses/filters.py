import django_filters

from apps.warehouses.models import Warehouse


class WarehouseFilter(django_filters.FilterSet):
    class Meta:
        model = Warehouse
        fields = ["is_active"]

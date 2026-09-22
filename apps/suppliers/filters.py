import django_filters

from apps.suppliers.models import Supplier


class SupplierFilter(django_filters.FilterSet):
    class Meta:
        model = Supplier
        fields = ["is_active"]

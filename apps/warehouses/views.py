from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView

from apps.common.permissions import ModelPermissions
from apps.common.scoping import visible_warehouses
from apps.common.mixins import AuditedModelView
from apps.warehouses.filters import WarehouseFilter
from apps.warehouses.serializers import WarehouseSerializer


class WarehouseQuerysetMixin:
    def get_queryset(self):
        return visible_warehouses(self.request.user)


class WarehouseListCreateView(WarehouseQuerysetMixin, AuditedModelView, ListCreateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = WarehouseSerializer
    filterset_class = WarehouseFilter
    search_fields = ["name", "code"]
    ordering_fields = ["name", "code"]
    ordering = ["name"]
    audit_fields = (
        "name",
        "code",
        "address_line",
        "city",
        "country",
        "contact_name",
        "phone",
        "email",
        "is_active",
    )
    http_method_names = ["get", "post", "head", "options"]


class WarehouseDetailView(WarehouseQuerysetMixin, AuditedModelView, RetrieveUpdateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = WarehouseSerializer
    audit_fields = WarehouseListCreateView.audit_fields
    http_method_names = ["get", "patch", "head", "options"]

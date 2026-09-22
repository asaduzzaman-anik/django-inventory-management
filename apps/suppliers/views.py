from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView

from apps.common.permissions import ModelPermissions
from apps.common.mixins import AuditedModelView
from apps.suppliers.filters import SupplierFilter
from apps.suppliers.models import Supplier
from apps.suppliers.serializers import SupplierSerializer


class SupplierListCreateView(AuditedModelView, ListCreateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.all()
    filterset_class = SupplierFilter
    search_fields = ["name", "code", "email"]
    ordering_fields = ["name", "code"]
    ordering = ["name"]
    audit_fields = (
        "name",
        "code",
        "email",
        "phone",
        "contact_name",
        "address_line",
        "city",
        "country",
        "is_active",
    )
    http_method_names = ["get", "post", "head", "options"]


class SupplierDetailView(AuditedModelView, RetrieveUpdateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.all()
    audit_fields = SupplierListCreateView.audit_fields
    http_method_names = ["get", "patch", "head", "options"]

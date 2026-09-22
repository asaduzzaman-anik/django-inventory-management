from decimal import Decimal

from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView

from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.catalog.filters import CategoryFilter, ProductFilter
from apps.catalog.models import Category, Product
from apps.catalog.serializers import CategorySerializer, ProductSerializer
from apps.common.permissions import ModelPermissions


class AuditedModelView:
    audit_fields = ()

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            instance=instance,
            metadata=self._audit_values(instance),
            request=self.request,
        )

    def perform_update(self, serializer):
        before = self._audit_values(serializer.instance)
        instance = serializer.save()
        after = self._audit_values(instance)
        changed = {field: after[field] for field in after if before.get(field) != after[field]}
        if changed:
            log_audit(
                user=self.request.user,
                action=AuditLog.Action.UPDATE,
                instance=instance,
                metadata=changed,
                request=self.request,
            )

    def _audit_values(self, instance):
        values = {}
        for field in self.audit_fields:
            value = getattr(instance, field)
            if isinstance(value, Decimal):
                value = str(value)
            elif hasattr(value, "name"):
                value = value.name or ""
            values[field] = value
        return values


class CategoryListCreateView(AuditedModelView, ListCreateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = CategorySerializer
    queryset = Category.objects.select_related("parent")
    filterset_class = CategoryFilter
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]
    audit_fields = ("name", "slug", "parent_id", "is_active")
    http_method_names = ["get", "post", "head", "options"]


class CategoryDetailView(AuditedModelView, RetrieveUpdateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = CategorySerializer
    queryset = Category.objects.select_related("parent")
    audit_fields = ("name", "slug", "parent_id", "is_active")
    http_method_names = ["get", "patch", "head", "options"]


class ProductListCreateView(AuditedModelView, ListCreateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("category")
    filterset_class = ProductFilter
    search_fields = ["name", "sku", "barcode"]
    ordering_fields = ["name", "sku", "created_at"]
    ordering = ["name"]
    audit_fields = (
        "sku",
        "barcode",
        "name",
        "category_id",
        "cost_price",
        "selling_price",
        "reorder_level",
        "unit",
        "is_active",
        "image",
    )
    http_method_names = ["get", "post", "head", "options"]


class ProductDetailView(AuditedModelView, RetrieveUpdateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("category")
    audit_fields = ProductListCreateView.audit_fields
    http_method_names = ["get", "patch", "head", "options"]

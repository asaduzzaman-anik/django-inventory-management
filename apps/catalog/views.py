from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView

from apps.catalog.filters import CategoryFilter, ProductFilter
from apps.catalog.models import Category, Product
from apps.catalog.serializers import CategorySerializer, ProductSerializer
from apps.common.permissions import ModelPermissions
from apps.common.mixins import AuditedModelView


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
    queryset = Product.objects.select_related("category", "preferred_supplier")
    filterset_class = ProductFilter
    search_fields = ["name", "sku", "barcode"]
    ordering_fields = ["name", "sku", "created_at"]
    ordering = ["name"]
    audit_fields = (
        "sku",
        "barcode",
        "name",
        "category_id",
        "preferred_supplier_id",
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
    queryset = Product.objects.select_related("category", "preferred_supplier")
    audit_fields = ProductListCreateView.audit_fields
    http_method_names = ["get", "patch", "head", "options"]

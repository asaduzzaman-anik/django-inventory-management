from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveAPIView
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from apps.common.permissions import ModelPermissions
from apps.common.scoping import visible_warehouses
from apps.inventory.filters import InventoryTransactionFilter, StockLevelFilter
from apps.inventory.models import InventoryTransaction
from apps.inventory.serializers import (
    InventoryTransactionSerializer,
    ReceiptWriteSerializer,
    StockLevelSerializer,
    StockReceiptSerializer,
)
from apps.inventory.services import _receipt_queryset, receive_stock, stock_queryset


class ReceiptPermissions(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method == "POST":
            return user.has_perm("inventory.receive_stock")
        return user.has_perm("inventory.view_stockreceipt")


class StockListView(ListAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = StockLevelSerializer
    filterset_class = StockLevelFilter
    search_fields = ["product__sku", "product__name"]
    ordering_fields = ["on_hand", "available"]
    ordering = ["warehouse__code", "product__sku"]

    def get_queryset(self):
        return stock_queryset().filter(warehouse__in=visible_warehouses(self.request.user))


class StockDetailView(RetrieveAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = StockLevelSerializer

    def get_queryset(self):
        return stock_queryset().filter(warehouse__in=visible_warehouses(self.request.user))


class WarehouseStockListView(StockListView):
    def get_queryset(self):
        warehouse = get_object_or_404(visible_warehouses(self.request.user), pk=self.kwargs["warehouse_id"])
        return super().get_queryset().filter(warehouse=warehouse)


class StockReceiptListCreateView(ListCreateAPIView):
    permission_classes = [ReceiptPermissions]
    serializer_class = StockReceiptSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return _receipt_queryset().filter(warehouse__in=visible_warehouses(self.request.user))

    def create(self, request, *args, **kwargs):
        serializer = ReceiptWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        warehouse = get_object_or_404(
            visible_warehouses(request.user),
            pk=serializer.validated_data["warehouse"].pk,
        )
        idempotency_key = (request.headers.get("Idempotency-Key") or "").strip() or None
        receipt, created = receive_stock(
            warehouse=warehouse,
            items=serializer.validated_data["items"],
            user=request.user,
            note=serializer.validated_data.get("note", ""),
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(
            StockReceiptSerializer(receipt).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class StockReceiptDetailView(RetrieveAPIView):
    permission_classes = [ReceiptPermissions]
    serializer_class = StockReceiptSerializer

    def get_queryset(self):
        return _receipt_queryset().filter(warehouse__in=visible_warehouses(self.request.user))


class InventoryTransactionListView(ListAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = InventoryTransactionSerializer
    filterset_class = InventoryTransactionFilter
    ordering_fields = ["created_at", "quantity_change"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return InventoryTransaction.objects.select_related("product", "warehouse", "created_by").filter(
            warehouse__in=visible_warehouses(self.request.user)
        )

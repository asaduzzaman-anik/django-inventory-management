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
    AdjustmentWriteSerializer,
    InventoryTransactionSerializer,
    ReceiptWriteSerializer,
    StockAdjustmentSerializer,
    StockLevelSerializer,
    StockReceiptSerializer,
    StockTransferSerializer,
    TransferWriteSerializer,
)
from apps.inventory.services import (
    _adjustment_queryset,
    _receipt_queryset,
    _transfer_queryset,
    adjust_stock,
    receive_stock,
    stock_queryset,
    transfer_stock,
)


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


class TransferPermissions(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method == "POST":
            return user.has_perm("inventory.transfer_stock")
        return user.has_perm("inventory.view_stocktransfer")


class AdjustmentPermissions(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method == "POST":
            return user.has_perm("inventory.adjust_stock")
        return user.has_perm("inventory.view_stockadjustment")


class StockTransferListCreateView(ListCreateAPIView):
    permission_classes = [TransferPermissions]
    serializer_class = StockTransferSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        visible = visible_warehouses(self.request.user)
        return _transfer_queryset().filter(source_warehouse__in=visible, destination_warehouse__in=visible)

    def create(self, request, *args, **kwargs):
        serializer = TransferWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        visible = visible_warehouses(request.user)
        source = get_object_or_404(visible, pk=data["source_warehouse"].pk)
        destination = get_object_or_404(visible, pk=data["destination_warehouse"].pk)
        idempotency_key = (request.headers.get("Idempotency-Key") or "").strip() or None
        document, created = transfer_stock(
            source=source,
            destination=destination,
            items=data["items"],
            user=request.user,
            note=data.get("note", ""),
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(
            StockTransferSerializer(document).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class StockTransferDetailView(RetrieveAPIView):
    permission_classes = [TransferPermissions]
    serializer_class = StockTransferSerializer

    def get_queryset(self):
        visible = visible_warehouses(self.request.user)
        return _transfer_queryset().filter(source_warehouse__in=visible, destination_warehouse__in=visible)


class StockAdjustmentListCreateView(ListCreateAPIView):
    permission_classes = [AdjustmentPermissions]
    serializer_class = StockAdjustmentSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return _adjustment_queryset().filter(warehouse__in=visible_warehouses(self.request.user))

    def create(self, request, *args, **kwargs):
        serializer = AdjustmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        warehouse = get_object_or_404(visible_warehouses(request.user), pk=data["warehouse"].pk)
        idempotency_key = (request.headers.get("Idempotency-Key") or "").strip() or None
        document, created = adjust_stock(
            warehouse=warehouse,
            product=data["product"],
            quantity_change=data["quantity_change"],
            reason=data["reason"],
            user=request.user,
            note=data.get("note", ""),
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(
            StockAdjustmentSerializer(document).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class StockAdjustmentDetailView(RetrieveAPIView):
    permission_classes = [AdjustmentPermissions]
    serializer_class = StockAdjustmentSerializer

    def get_queryset(self):
        return _adjustment_queryset().filter(warehouse__in=visible_warehouses(self.request.user))


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

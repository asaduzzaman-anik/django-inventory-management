from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ModelPermissions, RequirePermission
from apps.common.scoping import visible_warehouses
from apps.purchasing.filters import PurchaseOrderFilter, PurchaseReceiptFilter
from apps.purchasing.serializers import (
    PurchaseOrderCreateSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderUpdateSerializer,
    PurchaseReceiptSerializer,
    ReceiveWriteSerializer,
)
from apps.purchasing.services import (
    _order_queryset,
    _receipt_queryset,
    approve_purchase_order,
    cancel_purchase_order,
    create_purchase_order,
    receive_purchase_order,
    submit_purchase_order,
    update_purchase_order,
)


class CanSubmitPurchaseOrder(RequirePermission):
    required_permission = "purchasing.submit_purchaseorder"


class CanApprovePurchaseOrder(RequirePermission):
    required_permission = "purchasing.approve_purchaseorder"


class CanReceivePurchaseOrder(RequirePermission):
    required_permission = "purchasing.receive_purchaseorder"


class CanChangePurchaseOrder(RequirePermission):
    required_permission = "purchasing.change_purchaseorder"


class CanViewPurchaseOrder(RequirePermission):
    required_permission = "purchasing.view_purchaseorder"


def _visible_orders(user):
    return _order_queryset().filter(warehouse__in=visible_warehouses(user))


def _visible_receipts(user):
    return _receipt_queryset().filter(purchase_order__warehouse__in=visible_warehouses(user))


class PurchaseOrderListCreateView(ListCreateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = PurchaseOrderSerializer
    filterset_class = PurchaseOrderFilter
    search_fields = ["number"]
    ordering_fields = ["created_at", "number", "total"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return _visible_orders(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = PurchaseOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        warehouse = get_object_or_404(visible_warehouses(request.user), pk=data["warehouse"].pk)
        order = create_purchase_order(
            supplier=data["supplier"],
            warehouse=warehouse,
            items=data["items"],
            user=request.user,
            notes=data.get("notes", ""),
            request=request,
        )
        return Response(PurchaseOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class PurchaseOrderDetailView(RetrieveUpdateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = PurchaseOrderSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return _visible_orders(self.request.user)

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = PurchaseOrderUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = dict(serializer.validated_data)
        if "warehouse" in changes:
            changes["warehouse"] = get_object_or_404(visible_warehouses(request.user), pk=changes["warehouse"].pk)
        order = update_purchase_order(order=order, user=request.user, changes=changes, request=request)
        return Response(PurchaseOrderSerializer(order).data)


class PurchaseOrderSubmitView(APIView):
    permission_classes = [CanSubmitPurchaseOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = submit_purchase_order(order=order, user=request.user, request=request)
        return Response(PurchaseOrderSerializer(order).data)


class PurchaseOrderApproveView(APIView):
    permission_classes = [CanApprovePurchaseOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = approve_purchase_order(order=order, user=request.user, request=request)
        return Response(PurchaseOrderSerializer(order).data)


class PurchaseOrderCancelView(APIView):
    permission_classes = [CanChangePurchaseOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = cancel_purchase_order(order=order, user=request.user, request=request)
        return Response(PurchaseOrderSerializer(order).data)


class PurchaseOrderReceiveView(APIView):
    permission_classes = [CanReceivePurchaseOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        serializer = ReceiveWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        idempotency_key = (request.headers.get("Idempotency-Key") or "").strip() or None
        receipt, created = receive_purchase_order(
            order=order,
            items=serializer.validated_data["items"],
            user=request.user,
            note=serializer.validated_data.get("note", ""),
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(
            PurchaseReceiptSerializer(receipt).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class PurchaseReceiptListView(ListAPIView):
    permission_classes = [CanViewPurchaseOrder]
    serializer_class = PurchaseReceiptSerializer
    filterset_class = PurchaseReceiptFilter
    search_fields = ["number"]
    ordering_fields = ["received_at", "number"]
    ordering = ["-received_at"]

    def get_queryset(self):
        return _visible_receipts(self.request.user)


class PurchaseReceiptDetailView(RetrieveAPIView):
    permission_classes = [CanViewPurchaseOrder]
    serializer_class = PurchaseReceiptSerializer

    def get_queryset(self):
        return _visible_receipts(self.request.user)

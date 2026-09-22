from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ModelPermissions, RequirePermission
from apps.common.scoping import visible_warehouses
from apps.sales.filters import SalesOrderFilter, SalesReturnFilter
from apps.sales.serializers import (
    PaymentStatusSerializer,
    ReturnWriteSerializer,
    SalesOrderCreateSerializer,
    SalesOrderSerializer,
    SalesOrderUpdateSerializer,
    SalesReturnSerializer,
)
from apps.sales.services import (
    _order_queryset,
    _return_queryset,
    cancel_sales_order,
    complete_sales_order,
    confirm_sales_order,
    create_sales_order,
    create_sales_return,
    process_sales_order,
    update_payment_status,
    update_sales_order,
)


class CanConfirmSalesOrder(RequirePermission):
    required_permission = "sales.confirm_salesorder"


class CanCompleteSalesOrder(RequirePermission):
    required_permission = "sales.complete_salesorder"


class CanCancelSalesOrder(RequirePermission):
    required_permission = "sales.cancel_salesorder"


class CanChangeSalesOrder(RequirePermission):
    required_permission = "sales.change_salesorder"


class CanViewSalesOrder(RequirePermission):
    required_permission = "sales.view_salesorder"


def _visible_orders(user):
    return _order_queryset().filter(warehouse__in=visible_warehouses(user))


def _visible_returns(user):
    return _return_queryset().filter(sales_order__warehouse__in=visible_warehouses(user))


def _idempotency_key(request):
    return (request.headers.get("Idempotency-Key") or "").strip() or None


class SalesOrderListCreateView(ListCreateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = SalesOrderSerializer
    filterset_class = SalesOrderFilter
    search_fields = ["number", "customer_name"]
    ordering_fields = ["created_at", "number", "total"]
    ordering = ["-created_at"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return _visible_orders(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = SalesOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        warehouse = get_object_or_404(visible_warehouses(request.user), pk=data["warehouse"].pk)
        order, created = create_sales_order(
            warehouse=warehouse,
            customer_name=data["customer_name"],
            customer_email=data.get("customer_email", ""),
            customer_phone=data.get("customer_phone", ""),
            discount_amount=data.get("discount_amount", 0),
            tax_rate=data.get("tax_rate", 0),
            notes=data.get("notes", ""),
            items=data["items"],
            user=request.user,
            idempotency_key=_idempotency_key(request),
            request=request,
        )
        return Response(
            SalesOrderSerializer(order).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SalesOrderDetailView(RetrieveUpdateAPIView):
    permission_classes = [ModelPermissions]
    serializer_class = SalesOrderSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return _visible_orders(self.request.user)

    def update(self, request, *args, **kwargs):
        order = self.get_object()
        serializer = SalesOrderUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        changes = dict(serializer.validated_data)
        if "warehouse" in changes:
            changes["warehouse"] = get_object_or_404(visible_warehouses(request.user), pk=changes["warehouse"].pk)
        order = update_sales_order(order=order, user=request.user, changes=changes, request=request)
        return Response(SalesOrderSerializer(order).data)


class SalesOrderConfirmView(APIView):
    permission_classes = [CanConfirmSalesOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = confirm_sales_order(order=order, user=request.user, request=request)
        return Response(SalesOrderSerializer(order).data)


class SalesOrderProcessView(APIView):
    permission_classes = [CanConfirmSalesOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = process_sales_order(order=order, user=request.user, request=request)
        return Response(SalesOrderSerializer(order).data)


class SalesOrderCompleteView(APIView):
    permission_classes = [CanCompleteSalesOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = complete_sales_order(order=order, user=request.user, request=request)
        return Response(SalesOrderSerializer(order).data)


class SalesOrderCancelView(APIView):
    permission_classes = [CanCancelSalesOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        order = cancel_sales_order(order=order, user=request.user, request=request)
        return Response(SalesOrderSerializer(order).data)


class SalesOrderPaymentView(APIView):
    permission_classes = [CanChangeSalesOrder]

    def patch(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        serializer = PaymentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = update_payment_status(
            order=order,
            user=request.user,
            payment_status=serializer.validated_data["payment_status"],
            request=request,
        )
        return Response(SalesOrderSerializer(order).data)


class SalesOrderReturnView(APIView):
    permission_classes = [CanCompleteSalesOrder]

    def post(self, request, pk):
        order = get_object_or_404(_visible_orders(request.user), pk=pk)
        serializer = ReturnWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document, created = create_sales_return(
            order=order,
            items=serializer.validated_data["items"],
            user=request.user,
            note=serializer.validated_data.get("note", ""),
            idempotency_key=_idempotency_key(request),
            request=request,
        )
        return Response(
            SalesReturnSerializer(document).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SalesReturnListView(ListAPIView):
    permission_classes = [CanViewSalesOrder]
    serializer_class = SalesReturnSerializer
    filterset_class = SalesReturnFilter
    search_fields = ["number"]
    ordering_fields = ["created_at", "number"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return _visible_returns(self.request.user)


class SalesReturnDetailView(RetrieveAPIView):
    permission_classes = [CanViewSalesOrder]
    serializer_class = SalesReturnSerializer

    def get_queryset(self):
        return _visible_returns(self.request.user)

from django.urls import path

from apps.sales.views import (
    SalesOrderCancelView,
    SalesOrderCompleteView,
    SalesOrderConfirmView,
    SalesOrderDetailView,
    SalesOrderListCreateView,
    SalesOrderPaymentView,
    SalesOrderProcessView,
    SalesOrderReturnView,
    SalesReturnDetailView,
    SalesReturnListView,
)

urlpatterns = [
    path("sales-orders/", SalesOrderListCreateView.as_view(), name="sales-order-list"),
    path("sales-orders/<int:pk>/", SalesOrderDetailView.as_view(), name="sales-order-detail"),
    path("sales-orders/<int:pk>/confirm/", SalesOrderConfirmView.as_view(), name="sales-order-confirm"),
    path("sales-orders/<int:pk>/process/", SalesOrderProcessView.as_view(), name="sales-order-process"),
    path("sales-orders/<int:pk>/complete/", SalesOrderCompleteView.as_view(), name="sales-order-complete"),
    path("sales-orders/<int:pk>/cancel/", SalesOrderCancelView.as_view(), name="sales-order-cancel"),
    path("sales-orders/<int:pk>/payment/", SalesOrderPaymentView.as_view(), name="sales-order-payment"),
    path("sales-orders/<int:pk>/returns/", SalesOrderReturnView.as_view(), name="sales-order-return"),
    path("sales-returns/", SalesReturnListView.as_view(), name="sales-return-list"),
    path("sales-returns/<int:pk>/", SalesReturnDetailView.as_view(), name="sales-return-detail"),
]

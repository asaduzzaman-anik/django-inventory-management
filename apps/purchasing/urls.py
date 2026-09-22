from django.urls import path

from apps.purchasing.views import (
    PurchaseOrderApproveView,
    PurchaseOrderCancelView,
    PurchaseOrderDetailView,
    PurchaseOrderListCreateView,
    PurchaseOrderReceiveView,
    PurchaseOrderSubmitView,
    PurchaseReceiptDetailView,
    PurchaseReceiptListView,
)

urlpatterns = [
    path("purchase-orders/", PurchaseOrderListCreateView.as_view(), name="purchase-order-list"),
    path("purchase-orders/<int:pk>/", PurchaseOrderDetailView.as_view(), name="purchase-order-detail"),
    path("purchase-orders/<int:pk>/submit/", PurchaseOrderSubmitView.as_view(), name="purchase-order-submit"),
    path("purchase-orders/<int:pk>/approve/", PurchaseOrderApproveView.as_view(), name="purchase-order-approve"),
    path("purchase-orders/<int:pk>/cancel/", PurchaseOrderCancelView.as_view(), name="purchase-order-cancel"),
    path("purchase-orders/<int:pk>/receive/", PurchaseOrderReceiveView.as_view(), name="purchase-order-receive"),
    path("purchase-receipts/", PurchaseReceiptListView.as_view(), name="purchase-receipt-list"),
    path("purchase-receipts/<int:pk>/", PurchaseReceiptDetailView.as_view(), name="purchase-receipt-detail"),
]

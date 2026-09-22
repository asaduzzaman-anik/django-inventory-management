from django.urls import path

from apps.inventory.views import (
    InventoryTransactionListView,
    StockAdjustmentDetailView,
    StockAdjustmentListCreateView,
    StockDetailView,
    StockListView,
    StockReceiptDetailView,
    StockReceiptListCreateView,
    StockTransferDetailView,
    StockTransferListCreateView,
    WarehouseStockListView,
)

urlpatterns = [
    path("stock/", StockListView.as_view(), name="stock-list"),
    path("stock/<int:pk>/", StockDetailView.as_view(), name="stock-detail"),
    path("warehouses/<int:warehouse_id>/stock/", WarehouseStockListView.as_view(), name="warehouse-stock"),
    path("stock-receipts/", StockReceiptListCreateView.as_view(), name="stock-receipt-list"),
    path("stock-receipts/<int:pk>/", StockReceiptDetailView.as_view(), name="stock-receipt-detail"),
    path("inventory-transactions/", InventoryTransactionListView.as_view(), name="inventory-transaction-list"),
    path("stock-transfers/", StockTransferListCreateView.as_view(), name="stock-transfer-list"),
    path("stock-transfers/<int:pk>/", StockTransferDetailView.as_view(), name="stock-transfer-detail"),
    path("stock-adjustments/", StockAdjustmentListCreateView.as_view(), name="stock-adjustment-list"),
    path("stock-adjustments/<int:pk>/", StockAdjustmentDetailView.as_view(), name="stock-adjustment-detail"),
]

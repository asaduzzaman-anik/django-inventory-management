from django.urls import path

from apps.inventory.views import (
    InventoryTransactionListView,
    StockDetailView,
    StockListView,
    StockReceiptDetailView,
    StockReceiptListCreateView,
    WarehouseStockListView,
)

urlpatterns = [
    path("stock/", StockListView.as_view(), name="stock-list"),
    path("stock/<int:pk>/", StockDetailView.as_view(), name="stock-detail"),
    path("warehouses/<int:warehouse_id>/stock/", WarehouseStockListView.as_view(), name="warehouse-stock"),
    path("stock-receipts/", StockReceiptListCreateView.as_view(), name="stock-receipt-list"),
    path("stock-receipts/<int:pk>/", StockReceiptDetailView.as_view(), name="stock-receipt-detail"),
    path("inventory-transactions/", InventoryTransactionListView.as_view(), name="inventory-transaction-list"),
]

from django.urls import path

from apps.reports.views import (
    DashboardView,
    InventoryReportView,
    LowStockReportView,
    MovementReportView,
    ProductPerformanceReportView,
    PurchaseReportView,
    ReportExportView,
    SalesReportView,
    WarehouseReportView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/inventory/", InventoryReportView.as_view(), name="report-inventory"),
    path("reports/low-stock/", LowStockReportView.as_view(), name="report-low-stock"),
    path("reports/stock-movements/", MovementReportView.as_view(), name="report-stock-movements"),
    path("reports/purchases/", PurchaseReportView.as_view(), name="report-purchases"),
    path("reports/sales/", SalesReportView.as_view(), name="report-sales"),
    path("reports/warehouses/", WarehouseReportView.as_view(), name="report-warehouses"),
    path("reports/product-performance/", ProductPerformanceReportView.as_view(), name="report-product-performance"),
    path("reports/<slug:name>/export/", ReportExportView.as_view(), name="report-export"),
]

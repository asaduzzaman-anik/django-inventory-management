from django.http import Http404
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.common.pagination import StandardPagination
from apps.common.permissions import RequirePermission
from apps.reports.exports import export_rows
from apps.reports.services import (
    INVENTORY_COLUMNS,
    MOVEMENT_COLUMNS,
    PERFORMANCE_COLUMNS,
    PURCHASE_COLUMNS,
    SALES_COLUMNS,
    WAREHOUSE_COLUMNS,
    get_dashboard,
    report_rows,
)

EXPORT_COLUMNS = {
    "inventory": INVENTORY_COLUMNS,
    "low-stock": INVENTORY_COLUMNS,
    "stock-movements": MOVEMENT_COLUMNS,
    "purchases": PURCHASE_COLUMNS,
    "sales": SALES_COLUMNS,
    "warehouses": WAREHOUSE_COLUMNS,
    "product-performance": PERFORMANCE_COLUMNS,
}


class CanViewReports(RequirePermission):
    required_permission = "reports.view_reports"


class CanExportReports(RequirePermission):
    required_permission = "reports.export_reports"


class DashboardView(APIView):
    permission_classes = [CanViewReports]

    def get(self, request):
        return Response(get_dashboard(request.user))


class ReportListView(APIView):
    permission_classes = [CanViewReports]
    report_name = ""

    def get(self, request):
        rows = report_rows(self.report_name, request.user, request.query_params)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(rows, request)
        return paginator.get_paginated_response(page)


class InventoryReportView(ReportListView):
    report_name = "inventory"


class LowStockReportView(ReportListView):
    report_name = "low-stock"


class MovementReportView(ReportListView):
    report_name = "stock-movements"


class PurchaseReportView(ReportListView):
    report_name = "purchases"


class SalesReportView(ReportListView):
    report_name = "sales"


class WarehouseReportView(ReportListView):
    report_name = "warehouses"


class ProductPerformanceReportView(ReportListView):
    report_name = "product-performance"


class ReportExportView(APIView):
    permission_classes = [CanExportReports]

    def perform_content_negotiation(self, request, force=False):
        # `format` is the export type. DRF would otherwise treat it as a renderer.
        renderer = JSONRenderer()
        return renderer, renderer.media_type

    def get(self, request, name):
        columns = EXPORT_COLUMNS.get(name)
        if columns is None:
            raise Http404()
        export_format = (request.query_params.get("format") or "").lower()
        if export_format not in {"csv", "xlsx"}:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"format": "Choose csv or xlsx."})
        rows = report_rows(name, request.user, request.query_params)
        log_audit(
            user=request.user,
            action=AuditLog.Action.CREATE,
            entity_type="reports.Report",
            entity_id=name,
            entity_repr=name,
            metadata={
                "report": name,
                "format": export_format,
                "filters": {key: request.query_params.get(key) for key in request.query_params if key != "format"},
            },
            request=request,
        )
        return export_rows(name, columns, rows, export_format)

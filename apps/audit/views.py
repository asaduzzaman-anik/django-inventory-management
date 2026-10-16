from rest_framework.generics import ListAPIView

from apps.audit.filters import AuditLogFilter
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer
from apps.common.permissions import CanViewAuditLog


class AuditLogListView(ListAPIView):
    permission_classes = [CanViewAuditLog]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related("user")
    filterset_class = AuditLogFilter
    search_fields = ["user__username", "entity_type", "entity_repr", "entity_id"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

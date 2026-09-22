import django_filters

from apps.audit.models import AuditLog


class AuditLogFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter(field_name="user_id")
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = AuditLog
        fields = ["user", "action", "entity_type", "created_after", "created_before"]

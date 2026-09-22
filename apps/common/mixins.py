from decimal import Decimal

from apps.audit.models import AuditLog
from apps.audit.services import log_audit


class AuditedModelView:
    audit_fields = ()

    def perform_create(self, serializer):
        instance = serializer.save()
        log_audit(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            instance=instance,
            metadata=self._audit_values(instance),
            request=self.request,
        )

    def perform_update(self, serializer):
        before = self._audit_values(serializer.instance)
        instance = serializer.save()
        after = self._audit_values(instance)
        changed = {field: after[field] for field in after if before.get(field) != after[field]}
        if changed:
            log_audit(
                user=self.request.user,
                action=AuditLog.Action.UPDATE,
                instance=instance,
                metadata=changed,
                request=self.request,
            )

    def _audit_values(self, instance):
        values = {}
        for field in self.audit_fields:
            value = getattr(instance, field)
            if isinstance(value, Decimal):
                value = str(value)
            elif hasattr(value, "name"):
                value = value.name or ""
            values[field] = value
        return values

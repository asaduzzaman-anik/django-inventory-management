from apps.audit.models import AuditLog


def log_audit(*, user, action, instance=None, metadata=None, request=None, entity_type="", entity_id="", entity_repr=""):
    if instance is not None:
        entity_type = entity_type or instance._meta.label
        entity_id = entity_id or str(instance.pk)
        entity_repr = entity_repr or str(instance)

    ip_address = None
    user_agent = ""
    if request is not None:
        ip_address = request.META.get("REMOTE_ADDR") or None
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]

    return AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        entity_type=entity_type[:80],
        entity_id=str(entity_id)[:64],
        entity_repr=entity_repr[:255],
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )

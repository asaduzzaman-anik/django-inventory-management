from rest_framework.permissions import BasePermission


class RequirePermission(BasePermission):
    required_permission = ""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.has_perm(self.required_permission)
        )


class CanManageUsers(RequirePermission):
    required_permission = "accounts.manage_users"


class CanViewAuditLog(RequirePermission):
    required_permission = "audit.view_auditlog"

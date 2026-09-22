from rest_framework.permissions import BasePermission, DjangoModelPermissions


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


class ModelPermissions(DjangoModelPermissions):
    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": [],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }

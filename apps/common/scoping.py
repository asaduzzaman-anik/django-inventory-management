from apps.accounts.roles import role_name
from apps.warehouses.models import Warehouse


def visible_warehouses(user):
    if not getattr(user, "is_authenticated", False):
        return Warehouse.objects.none()
    if user.is_superuser or role_name(user) == "Super Admin":
        return Warehouse.objects.all()
    return Warehouse.objects.filter(assignments__user=user).distinct()

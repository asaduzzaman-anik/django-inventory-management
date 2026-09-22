ROLE_NAMES = (
    "Super Admin",
    "Warehouse Manager",
    "Inventory Staff",
    "Sales Staff",
    "Viewer",
)

ROLE_PERMISSIONS = {
    "Super Admin": (
        "accounts.manage_users",
        "audit.view_auditlog",
        "catalog.view_category",
        "catalog.add_category",
        "catalog.change_category",
        "catalog.view_product",
        "catalog.add_product",
        "catalog.change_product",
    ),
    "Warehouse Manager": (
        "catalog.view_category",
        "catalog.add_category",
        "catalog.change_category",
        "catalog.view_product",
        "catalog.add_product",
        "catalog.change_product",
    ),
    "Inventory Staff": (
        "catalog.view_category",
        "catalog.view_product",
    ),
    "Sales Staff": (
        "catalog.view_category",
        "catalog.view_product",
    ),
    "Viewer": (
        "catalog.view_category",
        "catalog.view_product",
    ),
}


def role_name(user):
    names = {group.name for group in user.groups.all()}
    for name in ROLE_NAMES:
        if name in names:
            return name
    return None

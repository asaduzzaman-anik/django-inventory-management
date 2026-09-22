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
    ),
    "Warehouse Manager": (),
    "Inventory Staff": (),
    "Sales Staff": (),
    "Viewer": (),
}


def role_name(user):
    names = {group.name for group in user.groups.all()}
    for name in ROLE_NAMES:
        if name in names:
            return name
    return None

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
        "suppliers.view_supplier",
        "suppliers.add_supplier",
        "suppliers.change_supplier",
        "warehouses.view_warehouse",
        "warehouses.add_warehouse",
        "warehouses.change_warehouse",
        "inventory.view_stocklevel",
        "inventory.view_stockreceipt",
        "inventory.view_inventorytransaction",
        "inventory.receive_stock",
    ),
    "Warehouse Manager": (
        "catalog.view_category",
        "catalog.add_category",
        "catalog.change_category",
        "catalog.view_product",
        "catalog.add_product",
        "catalog.change_product",
        "suppliers.view_supplier",
        "suppliers.add_supplier",
        "suppliers.change_supplier",
        "warehouses.view_warehouse",
        "inventory.view_stocklevel",
        "inventory.view_stockreceipt",
        "inventory.view_inventorytransaction",
        "inventory.receive_stock",
    ),
    "Inventory Staff": (
        "catalog.view_category",
        "catalog.view_product",
        "suppliers.view_supplier",
        "warehouses.view_warehouse",
        "inventory.view_stocklevel",
        "inventory.view_stockreceipt",
        "inventory.view_inventorytransaction",
        "inventory.receive_stock",
    ),
    "Sales Staff": (
        "catalog.view_category",
        "catalog.view_product",
        "suppliers.view_supplier",
        "warehouses.view_warehouse",
        "inventory.view_stocklevel",
        "inventory.view_stockreceipt",
        "inventory.view_inventorytransaction",
    ),
    "Viewer": (
        "catalog.view_category",
        "catalog.view_product",
        "suppliers.view_supplier",
        "warehouses.view_warehouse",
        "inventory.view_stocklevel",
        "inventory.view_stockreceipt",
        "inventory.view_inventorytransaction",
    ),
}


def role_name(user):
    names = {group.name for group in user.groups.all()}
    for name in ROLE_NAMES:
        if name in names:
            return name
    return None

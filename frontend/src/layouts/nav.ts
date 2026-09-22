export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", permission: "reports.view_reports", end: true },
  { to: "/products", label: "Products", permission: "catalog.view_product" },
  { to: "/categories", label: "Categories", permission: "catalog.view_category" },
  { to: "/suppliers", label: "Suppliers", permission: "suppliers.view_supplier" },
  { to: "/warehouses", label: "Warehouses", permission: "warehouses.view_warehouse" },
  { to: "/inventory", label: "Inventory", permission: "inventory.view_stocklevel" },
  { to: "/purchasing", label: "Purchasing", permission: "purchasing.view_purchaseorder" },
  { to: "/sales", label: "Sales", permission: "sales.view_salesorder" },
  { to: "/reports", label: "Reports", permission: "reports.view_reports" },
  { to: "/admin", label: "Admin", permission: "accounts.manage_users" },
] as const

export function canSee(user: { is_superuser: boolean; permissions: string[] }, permission: string) {
  return user.is_superuser || user.permissions.includes(permission)
}

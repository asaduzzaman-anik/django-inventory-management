export type AdminUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_active: boolean
  role: string | null
}

export type AuditLog = {
  id: number
  username: string | null
  action: string
  entity_type: string
  entity_id: string
  entity_repr: string
  created_at: string
}

export const ROLES = ["Super Admin", "Warehouse Manager", "Inventory Staff", "Sales Staff", "Viewer"] as const

export const AUDIT_ACTIONS = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "RECEIVE", "TRANSFER", "ADJUST"] as const

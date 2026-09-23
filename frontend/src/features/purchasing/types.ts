export type PurchaseItem = {
  id: number
  product: number
  sku: string
  product_name: string
  quantity_ordered: string
  quantity_received: string
  unit_cost: string
  line_total: string
}

export type PurchaseOrder = {
  id: number
  number: string
  supplier: number
  supplier_name: string
  warehouse: number
  warehouse_code: string
  status: string
  notes: string
  total: string
  created_at: string
  items: PurchaseItem[]
}

export type PurchaseReceipt = {
  id: number
  number: string
  purchase_order: number
  received_at: string
  note: string
  items: { id: number; sku: string; quantity: string }[]
}

export const PO_STATUSES = [
  ["DRAFT", "Draft"],
  ["SUBMITTED", "Submitted"],
  ["APPROVED", "Approved"],
  ["PARTIALLY_RECEIVED", "Partially received"],
  ["RECEIVED", "Received"],
  ["CANCELLED", "Cancelled"],
] as const

export function purchaseStatusLabel(status: string) {
  return PO_STATUSES.find(([value]) => value === status)?.[1] ?? status
}

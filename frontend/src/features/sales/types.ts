export type SalesItem = {
  id: number
  product: number
  sku: string
  product_name: string
  quantity: string
  unit_price: string
  line_total: string
  quantity_returned: string
}

export type SalesOrder = {
  id: number
  number: string
  warehouse: number
  warehouse_code: string
  customer_name: string
  customer_email: string
  customer_phone: string
  status: string
  payment_status: string
  discount_amount: string
  tax_rate: string
  subtotal: string
  tax_amount: string
  total: string
  notes: string
  items: SalesItem[]
}

export type SalesReturn = {
  id: number
  number: string
  sales_order: number
  note: string
  created_at: string
  items: { id: number; sku: string; quantity: string }[]
}

export const SALES_STATUSES = [
  ["DRAFT", "Draft"],
  ["CONFIRMED", "Confirmed"],
  ["PROCESSING", "Processing"],
  ["COMPLETED", "Completed"],
  ["CANCELLED", "Cancelled"],
] as const

export const PAYMENT_STATUSES = [
  ["UNPAID", "Unpaid"],
  ["PARTIAL", "Partial"],
  ["PAID", "Paid"],
] as const

export function salesStatusLabel(status: string) {
  return SALES_STATUSES.find(([value]) => value === status)?.[1] ?? status
}

export function paymentLabel(status: string) {
  return PAYMENT_STATUSES.find(([value]) => value === status)?.[1] ?? status
}

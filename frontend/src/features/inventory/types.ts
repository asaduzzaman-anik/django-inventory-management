export type StockRow = {
  id: number
  product: number
  sku: string
  product_name: string
  warehouse: number
  warehouse_code: string
  warehouse_name: string
  on_hand: string
  reserved: string
  available: string
  status: string
}

export type InventoryTransaction = {
  id: number
  product: number
  sku: string
  product_name: string
  warehouse: number
  warehouse_code: string
  transaction_type: string
  quantity_change: string
  balance_after: string
  reference_type: string
  reference_id: number | null
  reference_code: string
  note: string
  created_by_username: string
  created_at: string
}

export type ReceiptItem = {
  id: number
  product: number
  sku: string
  product_name: string
  quantity: string
  unit_cost: string
}

export type StockReceipt = {
  id: number
  number: string
  warehouse: number
  warehouse_code: string
  note: string
  created_at: string
  items: ReceiptItem[]
}

export type TransferItem = {
  id: number
  product: number
  sku: string
  product_name: string
  quantity: string
}

export type StockTransfer = {
  id: number
  number: string
  source_warehouse: number
  source_warehouse_code: string
  destination_warehouse: number
  destination_warehouse_code: string
  note: string
  created_at: string
  items: TransferItem[]
}

export type StockAdjustment = {
  id: number
  number: string
  warehouse: number
  warehouse_code: string
  product: number
  sku: string
  product_name: string
  quantity_change: string
  reason: string
  note: string
  created_at: string
}

export const STOCK_STATUSES = [
  ["IN_STOCK", "In stock"],
  ["LOW", "Low"],
  ["OUT", "Out"],
] as const

export const TRANSACTION_TYPES = [
  ["RECEIPT", "Receipt"],
  ["PURCHASE", "Purchase"],
  ["SALE", "Sale"],
  ["TRANSFER_IN", "Transfer in"],
  ["TRANSFER_OUT", "Transfer out"],
  ["ADJUSTMENT_IN", "Adjustment in"],
  ["ADJUSTMENT_OUT", "Adjustment out"],
  ["RETURN", "Return"],
] as const

export const ADJUSTMENT_REASONS = [
  ["DAMAGED", "Damaged"],
  ["LOST", "Lost"],
  ["FOUND", "Found"],
  ["CORRECTION", "Correction"],
  ["EXPIRED", "Expired"],
  ["OTHER", "Other"],
] as const

export function stockStatusLabel(status: string) {
  return STOCK_STATUSES.find(([value]) => value === status)?.[1] ?? status
}

export function transactionLabel(type: string) {
  return TRANSACTION_TYPES.find(([value]) => value === type)?.[1] ?? type
}

export function reasonLabel(reason: string) {
  return ADJUSTMENT_REASONS.find(([value]) => value === reason)?.[1] ?? reason
}

export function formatWhen(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function documentPath(referenceType: string, referenceId: number | null) {
  if (referenceId == null) {
    return null
  }
  if (referenceType === "stock_receipt") {
    return `/inventory/receipts/${referenceId}`
  }
  if (referenceType === "stock_transfer") {
    return `/inventory/transfers/${referenceId}`
  }
  if (referenceType === "stock_adjustment") {
    return `/inventory/adjustments/${referenceId}`
  }
  return null
}

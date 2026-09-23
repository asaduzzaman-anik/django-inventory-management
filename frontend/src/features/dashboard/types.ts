export type WarehouseValue = {
  warehouse_id: number
  code: string
  name: string
  value: string
}

export type DailyMovement = {
  date: string
  quantity: string
}

export type Dashboard = {
  products: number
  warehouses: number
  low_stock: number
  out_of_stock: number
  inventory_value: string
  purchase_total_30_days: string
  sales_total_30_days: string
  stock_value_by_warehouse: WarehouseValue[]
  daily_movements: DailyMovement[]
}

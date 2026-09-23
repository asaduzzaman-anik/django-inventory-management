import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DashboardCharts } from "./DashboardCharts.tsx"
import type { Dashboard } from "./types.ts"

const payload: Dashboard = {
  products: 1,
  warehouses: 2,
  low_stock: 0,
  out_of_stock: 0,
  inventory_value: "55.00",
  purchase_total_30_days: "20.00",
  sales_total_30_days: "17.00",
  stock_value_by_warehouse: [
    { warehouse_id: 1, code: "P13WH", name: "Phase 13 Warehouse", value: "35.00" },
    { warehouse_id: 2, code: "P14ST", name: "Phase 14 Store", value: "20.00" },
  ],
  daily_movements: [{ date: "2026-09-23", quantity: "5.000" }],
}

describe("dashboard charts", () => {
  it("renders the three chart headings from a payload", () => {
    render(<DashboardCharts data={payload} />)
    expect(screen.getByRole("heading", { name: "Stock value by warehouse" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Daily movement" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Sales and purchases" })).toBeInTheDocument()
  })
})

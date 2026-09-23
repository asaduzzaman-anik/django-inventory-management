import type { ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import type { Dashboard } from "./types.ts"

export function DashboardCharts({ data }: { data: Dashboard }) {
  const warehouseValue = data.stock_value_by_warehouse.map((row) => ({
    code: row.code,
    value: Number(row.value),
  }))
  const movements = data.daily_movements.map((row) => ({
    date: row.date,
    quantity: Number(row.quantity),
  }))
  const totals = [
    { label: "Purchases", total: Number(data.purchase_total_30_days) },
    { label: "Sales", total: Number(data.sales_total_30_days) },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Chart title="Stock value by warehouse">
        {warehouseValue.length ? (
          <BarChart width={320} height={220} data={warehouseValue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="code" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#115e59" />
          </BarChart>
        ) : (
          <EmptyChart />
        )}
      </Chart>
      <Chart title="Daily movement">
        {movements.length ? (
          <LineChart width={320} height={220} data={movements}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line dataKey="quantity" stroke="#115e59" dot={false} />
          </LineChart>
        ) : (
          <EmptyChart />
        )}
      </Chart>
      <Chart title="Sales and purchases">
        <BarChart width={320} height={220} data={totals}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#115e59" />
        </BarChart>
      </Chart>
    </div>
  )
}

function Chart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-x-auto rounded-md border border-stone-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-medium text-stone-800">{title}</h2>
      {children}
    </section>
  )
}

function EmptyChart() {
  return <p className="text-sm text-stone-500">No figures in this range.</p>
}

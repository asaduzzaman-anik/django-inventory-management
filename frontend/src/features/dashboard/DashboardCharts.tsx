import type { ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts"

import type { Dashboard } from "./types.ts"

const CHART = "#635bff"

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
            <CartesianGrid stroke="#e4e7ec" strokeDasharray="3 3" />
            <XAxis dataKey="code" stroke="#98a2b3" />
            <YAxis stroke="#98a2b3" />
            <Tooltip />
            <Bar dataKey="value" fill={CHART} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <EmptyChart />
        )}
      </Chart>
      <Chart title="Daily movement">
        {movements.length ? (
          <LineChart width={320} height={220} data={movements}>
            <CartesianGrid stroke="#e4e7ec" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#98a2b3" />
            <YAxis stroke="#98a2b3" />
            <Tooltip />
            <Line dataKey="quantity" stroke={CHART} strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <EmptyChart />
        )}
      </Chart>
      <Chart title="Sales and purchases">
        <BarChart width={320} height={220} data={totals}>
          <CartesianGrid stroke="#e4e7ec" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#98a2b3" />
          <YAxis stroke="#98a2b3" />
          <Tooltip />
          <Bar dataKey="total" fill={CHART} radius={[4, 4, 0, 0]} />
        </BarChart>
      </Chart>
    </div>
  )
}

function Chart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card overflow-x-auto">
      <div className="card-header">
        <h2 className="card-title text-sm">{title}</h2>
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}

function EmptyChart() {
  return <p className="text-sm text-gray-500">No figures in this range.</p>
}

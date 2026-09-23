import { useQuery } from "@tanstack/react-query"

import { api } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { DashboardCharts } from "./DashboardCharts.tsx"
import type { Dashboard } from "./types.ts"

const CARDS = [
  ["inventory_value", "Inventory value"],
  ["low_stock", "Low stock"],
  ["out_of_stock", "Out of stock"],
  ["sales_total_30_days", "Sales, 30 days"],
  ["purchase_total_30_days", "Purchases, 30 days"],
  ["products", "Active products"],
  ["warehouses", "Warehouses"],
] as const

export function DashboardPage() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<Dashboard>("/dashboard/")).data,
  })

  if (query.isPending) {
    return <Spinner />
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
        <p>Could not load the dashboard.</p>
        <Button className="mt-3" type="button" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const data = query.data
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(([key, label]) => (
          <div key={key} className="rounded-md border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-stone-900">{data[key]}</p>
          </div>
        ))}
      </div>
      <DashboardCharts data={data} />
    </section>
  )
}

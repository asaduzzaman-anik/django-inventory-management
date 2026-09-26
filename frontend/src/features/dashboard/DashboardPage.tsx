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
      <div className="alert alert-danger text-sm">
        <div>
          <p>Could not load the dashboard.</p>
          <Button className="mt-3" type="button" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const data = query.data
  return (
    <section className="space-y-6">
      <h1 className="page-title">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map(([key, label]) => (
          <div key={key} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 pt-5 pb-5 shadow-theme-sm sm:px-6">
            <div className="absolute flex h-12 w-12 items-center justify-center rounded-md bg-primary text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M4 19h16M8 16v-5M12 16V8M16 16v-3" />
              </svg>
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-1 ml-16 text-xl font-semibold text-gray-800">{data[key]}</p>
          </div>
        ))}
      </div>
      <DashboardCharts data={data} />
    </section>
  )
}

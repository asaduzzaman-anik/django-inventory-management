import { useQuery } from "@tanstack/react-query"
import type { IconType } from "react-icons"
import { LuBanknote, LuPackage, LuPackageX, LuShoppingCart, LuTrendingUp, LuTriangleAlert, LuWarehouse } from "react-icons/lu"

import { api } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { DashboardCharts } from "./DashboardCharts.tsx"
import type { Dashboard } from "./types.ts"

type StatKey = "products" | "warehouses" | "low_stock" | "out_of_stock" | "inventory_value" | "purchase_total_30_days" | "sales_total_30_days"

const CARDS: { key: StatKey; label: string; icon: IconType; tone: string }[] = [
  { key: "warehouses", label: "Warehouses", icon: LuWarehouse, tone: "bg-indigo-100 text-indigo-600" },
  { key: "products", label: "Active products", icon: LuPackage, tone: "bg-brand-100 text-brand-600" },
  { key: "low_stock", label: "Low stock", icon: LuTriangleAlert, tone: "bg-warning-100 text-warning-800" },
  { key: "out_of_stock", label: "Out of stock", icon: LuPackageX, tone: "bg-error-100 text-error-600" },
  { key: "inventory_value", label: "Inventory value", icon: LuBanknote, tone: "bg-success-100 text-success-700" },
  { key: "sales_total_30_days", label: "Sales, 30 days", icon: LuTrendingUp, tone: "bg-sky-100 text-sky-600" },
  { key: "purchase_total_30_days", label: "Purchases, 30 days", icon: LuShoppingCart, tone: "bg-orange-100 text-orange-600" },
]

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
        {CARDS.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white px-4 pt-5 pb-5 shadow-theme-sm sm:px-6">
            <div className={`absolute flex h-12 w-12 items-center justify-center rounded-md ${tone}`}>
              <Icon aria-hidden="true" size={22} />
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

import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"

import { api } from "../../api/client.ts"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { formatWhen, reasonLabel, type StockAdjustment } from "./types.ts"

export function AdjustmentDetailPage() {
  const { id } = useParams()
  const adjustment = useQuery({
    queryKey: ["adjustment", Number(id)],
    queryFn: async () => (await api.get<StockAdjustment>(`/stock-adjustments/${id}/`)).data,
  })

  if (adjustment.isPending) {
    return <Spinner />
  }
  if (adjustment.isError || !adjustment.data) {
    return <p className="text-sm text-red-800">Could not load this adjustment.</p>
  }

  const item = adjustment.data
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-teal-800 underline" to="/inventory">
          Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{item.number}</h1>
        <p className="text-sm text-stone-600">Adjustment</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Warehouse" value={item.warehouse_code} />
        <Field label="Product" value={`${item.sku} ${item.product_name}`} />
        <Field label="Quantity change" value={item.quantity_change} />
        <Field label="Reason" value={reasonLabel(item.reason)} />
        <Field label="Posted" value={formatWhen(item.created_at)} />
        <Field label="Note" value={item.note || "—"} />
      </dl>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  )
}

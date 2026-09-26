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
    return <p className="text-sm text-error-700">Could not load this adjustment.</p>
  }

  const item = adjustment.data
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm link" to="/inventory">
          Inventory
        </Link>
        <h1 className="mt-2 page-title">{item.number}</h1>
        <p className="text-sm text-gray-500">Adjustment</p>
      </div>
      <dl className="card card-body grid gap-4 text-sm sm:grid-cols-2">
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
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

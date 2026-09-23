import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"

import { api } from "../../api/client.ts"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { formatWhen, type StockTransfer } from "./types.ts"

export function TransferDetailPage() {
  const { id } = useParams()
  const transfer = useQuery({
    queryKey: ["transfer", Number(id)],
    queryFn: async () => (await api.get<StockTransfer>(`/stock-transfers/${id}/`)).data,
  })

  if (transfer.isPending) {
    return <Spinner />
  }
  if (transfer.isError || !transfer.data) {
    return <p className="text-sm text-red-800">Could not load this transfer.</p>
  }

  const item = transfer.data
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-teal-800 underline" to="/inventory">
          Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{item.number}</h1>
        <p className="text-sm text-stone-600">Transfer</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="From" value={item.source_warehouse_code} />
        <Field label="To" value={item.destination_warehouse_code} />
        <Field label="Posted" value={formatWhen(item.created_at)} />
        <Field label="Note" value={item.note || "—"} />
      </dl>
      <Table
        rows={item.items}
        rowKey={(row) => row.id}
        columns={[
          { key: "sku", header: "SKU", render: (row) => row.sku },
          { key: "product", header: "Product", render: (row) => row.product_name },
          { key: "quantity", header: "Quantity", render: (row) => row.quantity },
        ]}
      />
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

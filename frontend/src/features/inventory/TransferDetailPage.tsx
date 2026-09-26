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
    return <p className="text-sm text-error-700">Could not load this transfer.</p>
  }

  const item = transfer.data
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm link" to="/inventory">
          Inventory
        </Link>
        <h1 className="mt-2 page-title">{item.number}</h1>
        <p className="text-sm text-gray-500">Transfer</p>
      </div>
      <dl className="card card-body grid gap-4 text-sm sm:grid-cols-2">
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
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  )
}

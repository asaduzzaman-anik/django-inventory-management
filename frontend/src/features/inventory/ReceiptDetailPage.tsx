import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"

import { api } from "../../api/client.ts"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { formatWhen, type StockReceipt } from "./types.ts"

export function ReceiptDetailPage() {
  const { id } = useParams()
  const receipt = useQuery({
    queryKey: ["receipt", Number(id)],
    queryFn: async () => (await api.get<StockReceipt>(`/stock-receipts/${id}/`)).data,
  })

  if (receipt.isPending) {
    return <Spinner />
  }
  if (receipt.isError || !receipt.data) {
    return <p className="text-sm text-red-800">Could not load this receipt.</p>
  }

  const item = receipt.data
  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-teal-800 underline" to="/inventory">
          Inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">{item.number}</h1>
        <p className="text-sm text-stone-600">Receipt</p>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Warehouse" value={item.warehouse_code} />
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
          { key: "cost", header: "Unit cost", render: (row) => row.unit_cost },
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

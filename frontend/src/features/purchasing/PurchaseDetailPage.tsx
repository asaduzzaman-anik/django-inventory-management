import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { documentError } from "../../utils/apiError.ts"
import { useCan } from "../auth/useCan.ts"
import { formatWhen } from "../inventory/types.ts"
import { purchaseStatusLabel, type PurchaseItem, type PurchaseOrder, type PurchaseReceipt } from "./types.ts"

function remaining(item: PurchaseItem) {
  return (Number(item.quantity_ordered) - Number(item.quantity_received)).toFixed(3)
}

export function PurchaseDetailPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const queryClient = useQueryClient()
  const canChange = useCan("purchasing.change_purchaseorder")
  const canSubmit = useCan("purchasing.submit_purchaseorder")
  const canApprove = useCan("purchasing.approve_purchaseorder")
  const canReceive = useCan("purchasing.receive_purchaseorder")
  const [banner, setBanner] = useState("")
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState<"submit" | "approve" | "cancel" | "receive" | null>(null)
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const order = useQuery({
    queryKey: ["purchase-order", orderId],
    queryFn: async () => (await api.get<PurchaseOrder>(`/purchase-orders/${orderId}/`)).data,
  })
  const receipts = useQuery({
    queryKey: ["purchase-receipts", orderId],
    queryFn: () => fetchPage<PurchaseReceipt>("/purchase-receipts/", { purchase_order: orderId, page_size: 100 }),
  })

  async function refresh(message: string) {
    await queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] })
    await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
    await queryClient.invalidateQueries({ queryKey: ["purchase-receipts", orderId] })
    await queryClient.invalidateQueries({ queryKey: ["stock"] })
    await queryClient.invalidateQueries({ queryKey: ["notifications"] })
    toast(message)
    setAction(null)
    setQuantities({})
  }

  async function postAction() {
    if (!action) {
      return
    }
    setPending(true)
    setBanner("")
    try {
      if (action === "receive") {
        const items = Object.entries(quantities)
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([itemId, quantity]) => ({ item_id: Number(itemId), quantity }))
        await api.post(`/purchase-orders/${orderId}/receive/`, { items, note: "" })
        await refresh("Receipt posted.")
      } else {
        await api.post(`/purchase-orders/${orderId}/${action}/`)
        await refresh(`Purchase order ${action === "cancel" ? "cancelled" : action === "submit" ? "submitted" : "approved"}.`)
      }
    } catch (error) {
      setBanner(documentError(error))
      setAction(null)
    } finally {
      setPending(false)
    }
  }

  if (order.isPending) {
    return <Spinner />
  }
  if (order.isError || !order.data) {
    return <p className="text-sm text-red-800">Could not load this purchase order.</p>
  }

  const item = order.data
  const openLines = item.items.filter((line) => Number(remaining(line)) > 0)
  const canCancel = canChange && ["DRAFT", "SUBMITTED", "APPROVED"].includes(item.status) && item.items.every((line) => Number(line.quantity_received) === 0)
  const receiveReady = Object.values(quantities).some((quantity) => Number(quantity) > 0)

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-teal-800 underline" to="/purchasing">
            Purchasing
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">{item.number}</h1>
          <p className="text-sm text-stone-600">{purchaseStatusLabel(item.status)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status === "DRAFT" && canChange ? (
            <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800 ring-1 ring-stone-300" to={`/purchasing/${item.id}/edit`}>
              Edit
            </Link>
          ) : null}
          {item.status === "DRAFT" && canSubmit ? (
            <Button type="button" onClick={() => setAction("submit")}>
              Submit
            </Button>
          ) : null}
          {item.status === "SUBMITTED" && canApprove ? (
            <Button type="button" onClick={() => setAction("approve")}>
              Approve
            </Button>
          ) : null}
          {canCancel ? (
            <Button type="button" variant="danger" onClick={() => setAction("cancel")}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
      {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Supplier" value={item.supplier_name} />
        <Field label="Warehouse" value={item.warehouse_code} />
        <Field label="Total" value={item.total} />
        <Field label="Notes" value={item.notes || "—"} />
      </dl>
      <Table
        rows={item.items}
        rowKey={(row) => row.id}
        columns={[
          { key: "sku", header: "SKU", render: (row) => row.sku },
          { key: "product", header: "Product", render: (row) => row.product_name },
          { key: "ordered", header: "Ordered", render: (row) => row.quantity_ordered },
          { key: "received", header: "Received", render: (row) => row.quantity_received },
          { key: "remaining", header: "Remaining", render: (row) => remaining(row) },
          { key: "cost", header: "Unit cost", render: (row) => row.unit_cost },
          { key: "total", header: "Line total", render: (row) => row.line_total },
        ]}
      />
      {canReceive && ["APPROVED", "PARTIALLY_RECEIVED"].includes(item.status) && openLines.length ? (
        <div className="max-w-xl space-y-3">
          <h2 className="text-lg font-semibold text-stone-900">Receive</h2>
          {openLines.map((line) => (
            <Input
              key={line.id}
              label={`${line.sku} remaining ${remaining(line)}`}
              value={quantities[line.id] ?? ""}
              onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
            />
          ))}
          <Button type="button" disabled={!receiveReady} onClick={() => setAction("receive")}>
            Review receipt
          </Button>
        </div>
      ) : null}
      <div>
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Receipts</h2>
        {receipts.isError ? <p className="text-sm text-red-800">Could not load receipts.</p> : null}
        {receipts.data && !receipts.data.results.length ? <p className="text-sm text-stone-600">No receipts yet.</p> : null}
        <ul className="space-y-2 text-sm">
          {(receipts.data?.results ?? []).map((receipt) => (
            <li key={receipt.id} className="rounded-md border border-stone-200 bg-white px-3 py-2">
              <span className="font-medium">{receipt.number}</span>
              <span className="text-stone-500"> · {formatWhen(receipt.received_at)}</span>
              <span className="block text-stone-700">
                {receipt.items.map((line) => `${line.sku} ${line.quantity}`).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {action ? (
        <ConfirmDialog
          title={action === "receive" ? "Post receipt" : action === "cancel" ? "Cancel purchase order" : action === "submit" ? "Submit purchase order" : "Approve purchase order"}
          message={
            action === "receive"
              ? "Post the quantities entered above."
              : action === "cancel"
                ? `${item.number} will be cancelled.`
                : action === "submit"
                  ? `${item.number} will be submitted for approval.`
                  : `${item.number} will be approved for receiving.`
          }
          confirmLabel={action === "receive" ? "Post receipt" : action === "cancel" ? "Cancel order" : action === "submit" ? "Submit" : "Approve"}
          pending={pending}
          onConfirm={postAction}
          onClose={() => setAction(null)}
        />
      ) : null}
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

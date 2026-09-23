import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { documentError } from "../../utils/apiError.ts"
import { useCan } from "../auth/useCan.ts"
import { formatWhen } from "../inventory/types.ts"
import { PAYMENT_STATUSES, paymentLabel, salesStatusLabel, type SalesItem, type SalesOrder, type SalesReturn } from "./types.ts"

function returnable(item: SalesItem) {
  return (Number(item.quantity) - Number(item.quantity_returned)).toFixed(3)
}

export function SalesDetailPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const queryClient = useQueryClient()
  const canChange = useCan("sales.change_salesorder")
  const canConfirm = useCan("sales.confirm_salesorder")
  const canComplete = useCan("sales.complete_salesorder")
  const canCancel = useCan("sales.cancel_salesorder")
  const [banner, setBanner] = useState("")
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState<"confirm" | "process" | "complete" | "cancel" | "return" | null>(null)
  const [payment, setPayment] = useState("")
  const [quantities, setQuantities] = useState<Record<number, string>>({})
  const order = useQuery({
    queryKey: ["sales-order", orderId],
    queryFn: async () => (await api.get<SalesOrder>(`/sales-orders/${orderId}/`)).data,
  })
  const returns = useQuery({
    queryKey: ["sales-returns", orderId],
    queryFn: () => fetchPage<SalesReturn>("/sales-returns/", { sales_order: orderId, page_size: 100 }),
  })

  async function refresh(message: string) {
    await queryClient.invalidateQueries({ queryKey: ["sales-order", orderId] })
    await queryClient.invalidateQueries({ queryKey: ["sales-orders"] })
    await queryClient.invalidateQueries({ queryKey: ["sales-returns", orderId] })
    await queryClient.invalidateQueries({ queryKey: ["stock"] })
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
      if (action === "return") {
        const items = Object.entries(quantities)
          .filter(([, quantity]) => Number(quantity) > 0)
          .map(([itemId, quantity]) => ({ item_id: Number(itemId), quantity }))
        await api.post(`/sales-orders/${orderId}/returns/`, { items, note: "" })
        await refresh("Return posted.")
      } else {
        await api.post(`/sales-orders/${orderId}/${action}/`)
        const labels = { confirm: "confirmed", process: "processed", complete: "completed", cancel: "cancelled" }
        await refresh(`Sales order ${labels[action]}.`)
      }
    } catch (error) {
      setBanner(documentError(error))
      setAction(null)
    } finally {
      setPending(false)
    }
  }

  async function savePayment() {
    setPending(true)
    setBanner("")
    try {
      await api.patch(`/sales-orders/${orderId}/payment/`, { payment_status: payment || order.data?.payment_status })
      await refresh("Payment updated.")
    } catch (error) {
      setBanner(documentError(error))
    } finally {
      setPending(false)
    }
  }

  if (order.isPending) {
    return <Spinner />
  }
  if (order.isError || !order.data) {
    return <p className="text-sm text-red-800">Could not load this sales order.</p>
  }

  const item = order.data
  const paymentValue = payment || item.payment_status
  const openLines = item.items.filter((line) => Number(returnable(line)) > 0)
  const returnReady = Object.values(quantities).some((quantity) => Number(quantity) > 0)
  const messages = {
    confirm: `${item.number} will reserve stock.`,
    process: `${item.number} will move to processing.`,
    complete: `${item.number} will deduct the reserved stock.`,
    cancel: `${item.number} will be cancelled and any reservation released.`,
    return: "Post the return quantities entered above.",
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-teal-800 underline" to="/sales">
            Sales
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">{item.number}</h1>
          <p className="text-sm text-stone-600">
            {salesStatusLabel(item.status)} · {paymentLabel(item.payment_status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status === "DRAFT" && canChange ? (
            <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800 ring-1 ring-stone-300" to={`/sales/${item.id}/edit`}>
              Edit
            </Link>
          ) : null}
          {item.status === "DRAFT" && canConfirm ? (
            <Button type="button" onClick={() => setAction("confirm")}>
              Confirm
            </Button>
          ) : null}
          {item.status === "CONFIRMED" && canConfirm ? (
            <Button type="button" onClick={() => setAction("process")}>
              Process
            </Button>
          ) : null}
          {["CONFIRMED", "PROCESSING"].includes(item.status) && canComplete ? (
            <Button type="button" onClick={() => setAction("complete")}>
              Complete
            </Button>
          ) : null}
          {["DRAFT", "CONFIRMED", "PROCESSING"].includes(item.status) && canCancel ? (
            <Button type="button" variant="danger" onClick={() => setAction("cancel")}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
      {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Customer" value={item.customer_name} />
        <Field label="Warehouse" value={item.warehouse_code} />
        <Field label="Email" value={item.customer_email || "—"} />
        <Field label="Phone" value={item.customer_phone || "—"} />
        <Field label="Subtotal" value={item.subtotal} />
        <Field label="Discount" value={item.discount_amount} />
        <Field label="Tax" value={item.tax_amount} />
        <Field label="Total" value={item.total} />
        <Field label="Notes" value={item.notes || "—"} />
      </dl>
      {canChange ? (
        <div className="flex max-w-xs items-end gap-2">
          <div className="flex-1">
            <Select label="Payment" value={paymentValue} onChange={(event) => setPayment(event.target.value)}>
              {PAYMENT_STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="ghost" disabled={pending || paymentValue === item.payment_status} onClick={savePayment}>
            Update payment
          </Button>
        </div>
      ) : null}
      <Table
        rows={item.items}
        rowKey={(row) => row.id}
        columns={[
          { key: "sku", header: "SKU", render: (row) => row.sku },
          { key: "product", header: "Product", render: (row) => row.product_name },
          { key: "quantity", header: "Quantity", render: (row) => row.quantity },
          { key: "price", header: "Unit price", render: (row) => row.unit_price },
          { key: "total", header: "Line total", render: (row) => row.line_total },
          { key: "returned", header: "Returned", render: (row) => row.quantity_returned },
        ]}
      />
      {item.status === "COMPLETED" && canComplete && openLines.length ? (
        <div className="max-w-xl space-y-3">
          <h2 className="text-lg font-semibold text-stone-900">Return</h2>
          {openLines.map((line) => (
            <Input
              key={line.id}
              label={`${line.sku} returnable ${returnable(line)}`}
              value={quantities[line.id] ?? ""}
              onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
            />
          ))}
          <Button type="button" disabled={!returnReady} onClick={() => setAction("return")}>
            Review return
          </Button>
        </div>
      ) : null}
      <div>
        <h2 className="mb-2 text-lg font-semibold text-stone-900">Returns</h2>
        {returns.isError ? <p className="text-sm text-red-800">Could not load returns.</p> : null}
        {returns.data && !returns.data.results.length ? <p className="text-sm text-stone-600">No returns yet.</p> : null}
        <ul className="space-y-2 text-sm">
          {(returns.data?.results ?? []).map((document) => (
            <li key={document.id} className="rounded-md border border-stone-200 bg-white px-3 py-2">
              <span className="font-medium">{document.number}</span>
              <span className="text-stone-500"> · {formatWhen(document.created_at)}</span>
              <span className="block text-stone-700">{document.items.map((line) => `${line.sku} ${line.quantity}`).join(", ")}</span>
            </li>
          ))}
        </ul>
      </div>
      {action ? (
        <ConfirmDialog
          title={action === "return" ? "Post return" : `${action[0].toUpperCase()}${action.slice(1)} sales order`}
          message={messages[action]}
          confirmLabel={action === "return" ? "Post return" : action[0].toUpperCase() + action.slice(1)}
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

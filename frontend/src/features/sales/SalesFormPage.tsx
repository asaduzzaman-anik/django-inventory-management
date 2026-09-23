import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Textarea } from "../../components/ui/Textarea.tsx"
import { documentError } from "../../utils/apiError.ts"
import type { Product } from "../catalog/types.ts"
import { useInventoryChoices } from "../inventory/useInventoryChoices.ts"
import { LineEditor } from "../orders/LineEditor.tsx"
import { emptyLine, lineIssues, type LineDraft } from "../orders/lines.ts"
import type { Warehouse } from "../warehouses/types.ts"
import type { SalesOrder } from "./types.ts"

export function SalesFormPage() {
  const { id } = useParams()
  const orderId = id ? Number(id) : null
  const order = useQuery({
    queryKey: ["sales-order", orderId],
    queryFn: async () => (await api.get<SalesOrder>(`/sales-orders/${orderId}/`)).data,
    enabled: orderId !== null,
  })
  const { warehouses, products } = useInventoryChoices()

  if ((orderId !== null && order.isPending) || warehouses.isPending || products.isPending) {
    return <Spinner />
  }
  if (order.isError) {
    return <p className="text-sm text-red-800">Could not load this sales order.</p>
  }
  if (order.data && order.data.status !== "DRAFT") {
    return (
      <p className="text-sm text-stone-700">
        Only a draft sales order can be edited.{" "}
        <Link className="text-teal-800 underline" to={`/sales/${order.data.id}`}>
          Back to {order.data.number}
        </Link>
      </p>
    )
  }

  return <SalesDraft order={order.data} warehouses={warehouses.data?.results ?? []} products={products.data?.results ?? []} />
}

function SalesDraft({ order, warehouses, products }: { order?: SalesOrder; warehouses: Warehouse[]; products: Product[] }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [warehouse, setWarehouse] = useState(order ? String(order.warehouse) : "")
  const [customerName, setCustomerName] = useState(order?.customer_name ?? "")
  const [customerEmail, setCustomerEmail] = useState(order?.customer_email ?? "")
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone ?? "")
  const [discount, setDiscount] = useState(order?.discount_amount ?? "0")
  const [taxRate, setTaxRate] = useState(order?.tax_rate ?? "0")
  const [notes, setNotes] = useState(order?.notes ?? "")
  const [lines, setLines] = useState<LineDraft[]>(
    order?.items.map((item) => ({
      key: String(item.id),
      product: String(item.product),
      quantity: item.quantity,
      price: item.unit_price,
    })) ?? [emptyLine()],
  )
  const [banner, setBanner] = useState("")
  const [pending, setPending] = useState(false)

  async function save() {
    if (!warehouse || !customerName.trim()) {
      setBanner("Choose a warehouse and enter the customer name.")
      return
    }
    const issue = lineIssues(lines, "Unit price")
    if (issue) {
      setBanner(issue)
      return
    }
    const payload = {
      warehouse: Number(warehouse),
      customer_name: customerName.trim(),
      customer_email: customerEmail,
      customer_phone: customerPhone,
      discount_amount: discount || "0",
      tax_rate: taxRate || "0",
      notes,
      items: lines.map((line) => ({
        product: Number(line.product),
        quantity: line.quantity,
        unit_price: line.price,
      })),
    }
    setPending(true)
    setBanner("")
    try {
      const saved = order
        ? (await api.patch<SalesOrder>(`/sales-orders/${order.id}/`, payload)).data
        : (await api.post<SalesOrder>("/sales-orders/", payload)).data
      await queryClient.invalidateQueries({ queryKey: ["sales-orders"] })
      await queryClient.invalidateQueries({ queryKey: ["sales-order", saved.id] })
      toast("Sales order saved.")
      navigate(`/sales/${saved.id}`)
    } catch (error) {
      setBanner(documentError(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-4">
      <Link className="text-sm text-teal-800 underline" to={order ? `/sales/${order.id}` : "/sales"}>
        Back
      </Link>
      <h1 className="text-2xl font-semibold text-stone-900">{order ? `Edit ${order.number}` : "New sales order"}</h1>
      {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <Select label="Warehouse" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}>
          <option value="">Choose a warehouse</option>
          {warehouses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} {item.name}
            </option>
          ))}
        </Select>
        <Input label="Customer name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        <Input label="Email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
        <Input label="Phone" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
        <Input label="Discount" value={discount} onChange={(event) => setDiscount(event.target.value)} />
        <Input label="Tax rate" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} />
      </div>
      <Textarea label="Notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      <LineEditor
        lines={lines}
        products={products}
        warehouseId={warehouse}
        priceLabel="Unit price"
        priceKey="selling_price"
        showAvailable
        onChange={setLines}
      />
      <Button type="button" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save draft"}
      </Button>
    </section>
  )
}

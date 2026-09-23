import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Textarea } from "../../components/ui/Textarea.tsx"
import { documentError } from "../../utils/apiError.ts"
import type { Product } from "../catalog/types.ts"
import { LineEditor } from "../orders/LineEditor.tsx"
import { emptyLine, lineIssues, type LineDraft } from "../orders/lines.ts"
import type { Supplier } from "../suppliers/types.ts"
import { useInventoryChoices } from "../inventory/useInventoryChoices.ts"
import type { PurchaseOrder } from "./types.ts"

export function PurchaseFormPage() {
  const { id } = useParams()
  const orderId = id ? Number(id) : null
  const order = useQuery({
    queryKey: ["purchase-order", orderId],
    queryFn: async () => (await api.get<PurchaseOrder>(`/purchase-orders/${orderId}/`)).data,
    enabled: orderId !== null,
  })
  const { warehouses, products } = useInventoryChoices()
  const suppliers = useQuery({
    queryKey: ["suppliers", "options", "active"],
    queryFn: () => fetchPage<Supplier>("/suppliers/", { is_active: true, page_size: 100, ordering: "name" }),
  })

  if ((orderId !== null && order.isPending) || warehouses.isPending || products.isPending || suppliers.isPending) {
    return <Spinner />
  }
  if (order.isError) {
    return <p className="text-sm text-red-800">Could not load this purchase order.</p>
  }
  if (order.data && order.data.status !== "DRAFT") {
    return (
      <p className="text-sm text-stone-700">
        Only a draft purchase order can be edited.{" "}
        <Link className="text-teal-800 underline" to={`/purchasing/${order.data.id}`}>
          Back to {order.data.number}
        </Link>
      </p>
    )
  }

  return (
    <PurchaseDraft
      order={order.data}
      suppliers={suppliers.data?.results ?? []}
      warehouses={warehouses.data?.results ?? []}
      products={products.data?.results ?? []}
    />
  )
}

function PurchaseDraft({
  order,
  suppliers,
  warehouses,
  products,
}: {
  order?: PurchaseOrder
  suppliers: Supplier[]
  warehouses: { id: number; code: string; name: string }[]
  products: Product[]
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [supplier, setSupplier] = useState(order ? String(order.supplier) : "")
  const [warehouse, setWarehouse] = useState(order ? String(order.warehouse) : "")
  const [notes, setNotes] = useState(order?.notes ?? "")
  const [lines, setLines] = useState<LineDraft[]>(
    order?.items.map((item) => ({
      key: String(item.id),
      product: String(item.product),
      quantity: item.quantity_ordered,
      price: item.unit_cost,
    })) ?? [emptyLine()],
  )
  const [banner, setBanner] = useState("")
  const [pending, setPending] = useState(false)

  async function save() {
    if (!supplier || !warehouse) {
      setBanner("Choose a supplier and a warehouse.")
      return
    }
    const issue = lineIssues(lines, "Unit cost")
    if (issue) {
      setBanner(issue)
      return
    }
    const payload = {
      supplier: Number(supplier),
      warehouse: Number(warehouse),
      notes,
      items: lines.map((line) => ({
        product: Number(line.product),
        quantity_ordered: line.quantity,
        unit_cost: line.price,
      })),
    }
    setPending(true)
    setBanner("")
    try {
      const saved = order
        ? (await api.patch<PurchaseOrder>(`/purchase-orders/${order.id}/`, payload)).data
        : (await api.post<PurchaseOrder>("/purchase-orders/", payload)).data
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      await queryClient.invalidateQueries({ queryKey: ["purchase-order", saved.id] })
      toast("Purchase order saved.")
      navigate(`/purchasing/${saved.id}`)
    } catch (error) {
      setBanner(documentError(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-4">
      <Link className="text-sm text-teal-800 underline" to={order ? `/purchasing/${order.id}` : "/purchasing"}>
        Back
      </Link>
      <h1 className="text-2xl font-semibold text-stone-900">{order ? `Edit ${order.number}` : "New purchase order"}</h1>
      {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <Select label="Supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)}>
          <option value="">Choose a supplier</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} {item.name}
            </option>
          ))}
        </Select>
        <Select label="Warehouse" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}>
          <option value="">Choose a warehouse</option>
          {warehouses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} {item.name}
            </option>
          ))}
        </Select>
      </div>
      <Textarea label="Notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      <LineEditor
        lines={lines}
        products={products}
        warehouseId={warehouse}
        priceLabel="Unit cost"
        priceKey="cost_price"
        onChange={setLines}
      />
      <Button type="button" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save draft"}
      </Button>
    </section>
  )
}

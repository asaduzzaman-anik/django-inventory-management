import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Textarea } from "../../components/ui/Textarea.tsx"
import { Button } from "../../components/ui/Button.tsx"
import { applyFieldErrors, documentError } from "../../utils/apiError.ts"
import { receiveSchema, type ReceiveValues } from "./schemas.ts"
import type { StockReceipt } from "./types.ts"
import { useInventoryChoices } from "./useInventoryChoices.ts"

const emptyReceive: ReceiveValues = { warehouse: "", product: "", quantity: "", unit_cost: "", note: "" }

export function ReceivePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { warehouses, products } = useInventoryChoices()
  const [banner, setBanner] = useState("")
  const [pendingValues, setPendingValues] = useState<ReceiveValues | null>(null)
  const [posting, setPosting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReceiveValues>({ resolver: zodResolver(receiveSchema), defaultValues: emptyReceive })

  async function post(values: ReceiveValues) {
    setPosting(true)
    setBanner("")
    try {
      const receipt = (
        await api.post<StockReceipt>("/stock-receipts/", {
          warehouse: Number(values.warehouse),
          note: values.note,
          items: [{ product: Number(values.product), quantity: values.quantity, unit_cost: values.unit_cost }],
        })
      ).data
      await queryClient.invalidateQueries({ queryKey: ["stock"] })
      await queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast("Receipt posted.")
      navigate(`/inventory/receipts/${receipt.id}`)
    } catch (error) {
      applyFieldErrors(error, setError)
      setBanner(documentError(error))
      setPendingValues(null)
    } finally {
      setPosting(false)
    }
  }

  if (warehouses.isPending || products.isPending) {
    return <Spinner />
  }

  const productName = products.data?.results.find((item) => String(item.id) === pendingValues?.product)
  const warehouseName = warehouses.data?.results.find((item) => String(item.id) === pendingValues?.warehouse)

  return (
    <section>
      <Link className="text-sm text-teal-800 underline" to="/inventory">
        Inventory
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold text-stone-900">Receive stock</h1>
      <form className="max-w-xl space-y-4" noValidate onSubmit={handleSubmit((values) => setPendingValues(values))}>
        {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
        <Select label="Warehouse" error={errors.warehouse?.message} {...register("warehouse")}>
          <option value="">Choose a warehouse</option>
          {(warehouses.data?.results ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} {item.name}
            </option>
          ))}
        </Select>
        <Select label="Product" error={errors.product?.message} {...register("product")}>
          <option value="">Choose a product</option>
          {(products.data?.results ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.sku} {item.name}
            </option>
          ))}
        </Select>
        <Input label="Quantity" error={errors.quantity?.message} {...register("quantity")} />
        <Input label="Unit cost" error={errors.unit_cost?.message} {...register("unit_cost")} />
        <Textarea label="Note" rows={3} error={errors.note?.message} {...register("note")} />
        <Button type="submit">Review receipt</Button>
      </form>
      {pendingValues ? (
        <ConfirmDialog
          title="Post receipt"
          message={`Receive ${pendingValues.quantity} of ${productName ? `${productName.sku} ${productName.name}` : "this product"} into ${warehouseName ? `${warehouseName.code} ${warehouseName.name}` : "this warehouse"}.`}
          confirmLabel="Post receipt"
          pending={posting}
          onConfirm={() => post(pendingValues)}
          onClose={() => setPendingValues(null)}
        />
      ) : null}
    </section>
  )
}

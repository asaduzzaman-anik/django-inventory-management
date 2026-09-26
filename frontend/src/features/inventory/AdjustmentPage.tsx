import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { Textarea } from "../../components/ui/Textarea.tsx"
import { applyFieldErrors, documentError } from "../../utils/apiError.ts"
import { adjustmentIssues, adjustmentSchema, type AdjustmentValues } from "./schemas.ts"
import { ADJUSTMENT_REASONS, type StockAdjustment } from "./types.ts"
import { useAvailableStock } from "./useAvailableStock.ts"
import { useInventoryChoices } from "./useInventoryChoices.ts"

const emptyAdjustment: AdjustmentValues = { warehouse: "", product: "", quantity_change: "", reason: "CORRECTION", note: "" }

export function AdjustmentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { warehouses, products } = useInventoryChoices()
  const [banner, setBanner] = useState("")
  const [pendingValues, setPendingValues] = useState<AdjustmentValues | null>(null)
  const [posting, setPosting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<AdjustmentValues>({ resolver: zodResolver(adjustmentSchema), defaultValues: emptyAdjustment })
  const warehouse = watch("warehouse")
  const product = watch("product")
  const available = useAvailableStock(warehouse, product)

  function review(values: AdjustmentValues) {
    const issues = adjustmentIssues(values)
    if (issues.quantity_change) {
      setError("quantity_change", { message: issues.quantity_change })
    }
    if (issues.note) {
      setError("note", { message: issues.note })
    }
    if (issues.quantity_change || issues.note) {
      return
    }
    setPendingValues(values)
  }

  async function post(values: AdjustmentValues) {
    setPosting(true)
    setBanner("")
    try {
      const document = (
        await api.post<StockAdjustment>("/stock-adjustments/", {
          warehouse: Number(values.warehouse),
          product: Number(values.product),
          quantity_change: values.quantity_change,
          reason: values.reason,
          note: values.note,
        })
      ).data
      await queryClient.invalidateQueries({ queryKey: ["stock"] })
      await queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast("Adjustment posted.")
      navigate(`/inventory/adjustments/${document.id}`)
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

  return (
    <section>
      <Link className="text-sm link" to="/inventory">
        Inventory
      </Link>
      <h1 className="mb-4 mt-2 page-title">Adjust stock</h1>
      <form className="card card-body max-w-3xl space-y-5" noValidate onSubmit={handleSubmit(review)}>
        {banner ? <p className="alert alert-danger text-sm">{banner}</p> : null}
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
        <p className="text-sm text-gray-500">Available: {available}</p>
        <Input label="Quantity change" error={errors.quantity_change?.message} {...register("quantity_change")} />
        <p className="text-sm text-gray-500">Use a negative number to remove stock.</p>
        <Select label="Reason" error={errors.reason?.message} {...register("reason")}>
          {ADJUSTMENT_REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Textarea label="Note" rows={3} error={errors.note?.message} {...register("note")} />
        <Button type="submit">Review adjustment</Button>
      </form>
      {pendingValues ? (
        <ConfirmDialog
          title="Post adjustment"
          message={`Change ${productName ? productName.sku : "this product"} by ${pendingValues.quantity_change}. Available: ${available}.`}
          confirmLabel="Post adjustment"
          pending={posting}
          onConfirm={() => post(pendingValues)}
          onClose={() => setPendingValues(null)}
        />
      ) : null}
    </section>
  )
}

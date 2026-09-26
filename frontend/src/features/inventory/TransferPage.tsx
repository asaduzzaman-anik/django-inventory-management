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
import { transferSchema, type TransferValues } from "./schemas.ts"
import type { StockTransfer } from "./types.ts"
import { useAvailableStock } from "./useAvailableStock.ts"
import { useInventoryChoices } from "./useInventoryChoices.ts"

const emptyTransfer: TransferValues = {
  source_warehouse: "",
  destination_warehouse: "",
  product: "",
  quantity: "",
  note: "",
}

export function TransferPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { warehouses, products } = useInventoryChoices()
  const [banner, setBanner] = useState("")
  const [pendingValues, setPendingValues] = useState<TransferValues | null>(null)
  const [posting, setPosting] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<TransferValues>({ resolver: zodResolver(transferSchema), defaultValues: emptyTransfer })
  const source = watch("source_warehouse")
  const product = watch("product")
  const available = useAvailableStock(source, product)

  async function post(values: TransferValues) {
    setPosting(true)
    setBanner("")
    try {
      const document = (
        await api.post<StockTransfer>("/stock-transfers/", {
          source_warehouse: Number(values.source_warehouse),
          destination_warehouse: Number(values.destination_warehouse),
          note: values.note,
          items: [{ product: Number(values.product), quantity: values.quantity }],
        })
      ).data
      await queryClient.invalidateQueries({ queryKey: ["stock"] })
      await queryClient.invalidateQueries({ queryKey: ["transactions"] })
      toast("Transfer posted.")
      navigate(`/inventory/transfers/${document.id}`)
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
      <h1 className="mb-4 mt-2 page-title">Transfer stock</h1>
      <form className="card card-body max-w-3xl space-y-5" noValidate onSubmit={handleSubmit((values) => setPendingValues(values))}>
        {banner ? <p className="alert alert-danger text-sm">{banner}</p> : null}
        <Select label="Source warehouse" error={errors.source_warehouse?.message} {...register("source_warehouse")}>
          <option value="">Choose a warehouse</option>
          {(warehouses.data?.results ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} {item.name}
            </option>
          ))}
        </Select>
        <Select label="Destination warehouse" error={errors.destination_warehouse?.message} {...register("destination_warehouse")}>
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
        <p className="text-sm text-gray-500">Available at source: {available}</p>
        <Input label="Quantity" error={errors.quantity?.message} {...register("quantity")} />
        <Textarea label="Note" rows={3} error={errors.note?.message} {...register("note")} />
        <Button type="submit">Review transfer</Button>
      </form>
      {pendingValues ? (
        <ConfirmDialog
          title="Post transfer"
          message={`Move ${pendingValues.quantity} of ${productName ? productName.sku : "this product"}. Available at the source: ${available}.`}
          confirmLabel="Post transfer"
          pending={posting}
          onConfirm={() => post(pendingValues)}
          onClose={() => setPendingValues(null)}
        />
      ) : null}
    </section>
  )
}

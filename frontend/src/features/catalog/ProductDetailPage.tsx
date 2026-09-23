import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { useCan } from "../auth/useCan.ts"
import { StockTable } from "../inventory/StockTable.tsx"
import type { StockRow } from "../inventory/types.ts"
import type { Product } from "./types.ts"

export function ProductDetailPage() {
  const { id } = useParams()
  const canChange = useCan("catalog.change_product")
  const canStock = useCan("inventory.view_stocklevel")
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const product = useQuery({
    queryKey: ["product", Number(id)],
    queryFn: async () => (await api.get<Product>(`/products/${id}/`)).data,
  })
  const stock = useQuery({
    queryKey: ["stock", "product", Number(id)],
    queryFn: () => fetchPage<StockRow>("/stock/", { product: Number(id), page_size: 100 }),
    enabled: canStock,
  })

  async function deactivate() {
    setPending(true)
    try {
      await api.patch(`/products/${id}/`, { is_active: false })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({ queryKey: ["product", Number(id)] })
      toast("Product deactivated.")
      setConfirming(false)
    } finally {
      setPending(false)
    }
  }

  if (product.isPending) {
    return <Spinner />
  }
  if (product.isError || !product.data) {
    return <p className="text-sm text-red-800">Could not load this product.</p>
  }

  const item = product.data
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-teal-800 underline" to="/products">
            Products
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">
            {item.sku} {item.name}
          </h1>
          <p className="text-sm text-stone-600">{item.is_active ? "Active" : "Inactive"}</p>
        </div>
        {canChange ? (
          <div className="flex gap-2">
            <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800 ring-1 ring-stone-300" to={`/products/${item.id}/edit`}>
              Edit
            </Link>
            {item.is_active ? (
              <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
                Deactivate
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {item.image ? <img src={item.image} alt="" className="h-32 w-32 rounded object-cover" /> : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Detail label="Category" value={item.category_name} />
        <Detail label="Supplier" value={item.preferred_supplier_name ?? "—"} />
        <Detail label="Barcode" value={item.barcode ?? "—"} />
        <Detail label="Unit" value={item.unit} />
        <Detail label="Cost price" value={item.cost_price} />
        <Detail label="Selling price" value={item.selling_price} />
        <Detail label="Reorder level" value={item.reorder_level} />
      </dl>
      {item.description ? <p className="text-sm text-stone-700">{item.description}</p> : null}
      {canStock ? (
        <div>
          <h2 className="mb-2 text-lg font-medium text-stone-900">Stock by warehouse</h2>
          {stock.isPending ? <Spinner /> : stock.isError ? <p className="text-sm text-red-800">Could not load stock.</p> : <StockTable rows={stock.data?.results ?? []} showProduct={false} />}
        </div>
      ) : null}
      {confirming ? (
        <ConfirmDialog
          title="Deactivate product"
          message={`${item.sku} will leave the active product list.`}
          confirmLabel="Deactivate"
          pending={pending}
          onConfirm={deactivate}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  )
}

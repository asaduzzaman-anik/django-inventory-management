import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { Spinner } from "../../components/ui/Spinner.tsx"
import type { Supplier } from "../suppliers/types.ts"
import { ProductForm } from "./ProductForm.tsx"
import { productPayload, productValues } from "./productPayload.ts"
import type { ProductValues } from "./schemas.ts"
import type { Category, Product } from "./types.ts"

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const productId = id ? Number(id) : null
  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => (await api.get<Product>(`/products/${productId}/`)).data,
    enabled: productId !== null,
  })
  const categories = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => fetchPage<Category>("/categories/", { page_size: 100, ordering: "name" }),
  })
  const suppliers = useQuery({
    queryKey: ["suppliers", "options"],
    queryFn: () => fetchPage<Supplier>("/suppliers/", { page_size: 100, ordering: "name" }),
  })

  async function onSubmit(values: ProductValues, file: File | null) {
    const payload = productPayload(values, file)
    const saved = productId
      ? (await api.patch<Product>(`/products/${productId}/`, payload)).data
      : (await api.post<Product>("/products/", payload)).data
    await queryClient.invalidateQueries({ queryKey: ["products"] })
    await queryClient.invalidateQueries({ queryKey: ["product", saved.id] })
    toast("Product saved.")
    navigate(`/products/${saved.id}`)
  }

  if ((productId !== null && product.isPending) || categories.isPending || suppliers.isPending) {
    return <Spinner />
  }
  if (product.isError) {
    return <p className="text-sm text-error-700">Could not load this product.</p>
  }

  return (
    <section>
      <Link className="text-sm link" to={productId ? `/products/${productId}` : "/products"}>
        Back
      </Link>
      <h1 className="mt-2 mb-4 page-title">{productId ? "Edit product" : "New product"}</h1>
      <ProductForm
        categories={(categories.data?.results ?? []).filter(
          (category) => category.is_active || category.id === product.data?.category,
        )}
        suppliers={(suppliers.data?.results ?? []).filter(
          (supplier) => supplier.is_active || supplier.id === product.data?.preferred_supplier,
        )}
        defaultValues={product.data ? productValues(product.data) : undefined}
        imageUrl={product.data?.image}
        submitLabel="Save product"
        onSubmit={onSubmit}
      />
    </section>
  )
}

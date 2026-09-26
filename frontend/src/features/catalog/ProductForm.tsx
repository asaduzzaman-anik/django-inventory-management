import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "../../components/ui/Button.tsx"
import { Checkbox } from "../../components/ui/Checkbox.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Textarea } from "../../components/ui/Textarea.tsx"
import { applyFieldErrors, formBanner } from "../../utils/apiError.ts"
import type { ApiErrorBody } from "../../types/api.ts"
import { productSchema, type ProductValues } from "./schemas.ts"
import { PRODUCT_UNITS, type Category } from "./types.ts"
import { emptyProduct } from "./productPayload.ts"
import type { Supplier } from "../suppliers/types.ts"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function ProductForm({
  categories,
  suppliers,
  defaultValues,
  imageUrl,
  submitLabel,
  onSubmit,
}: {
  categories: Category[]
  suppliers: Supplier[]
  defaultValues?: ProductValues
  imageUrl?: string | null
  submitLabel: string
  onSubmit: (values: ProductValues, file: File | null) => Promise<void>
}) {
  const [banner, setBanner] = useState("")
  const [imageError, setImageError] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues ?? emptyProduct,
  })

  function chooseImage(next: File | null) {
    if (next && (!IMAGE_TYPES.includes(next.type) || next.size > 2 * 1024 * 1024)) {
      setFile(null)
      setImageError("Use a JPEG, PNG, or WEBP image up to 2 MB.")
      return
    }
    setFile(next)
    setImageError("")
  }

  return (
    <form
      className="card card-body max-w-3xl space-y-5"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        if (imageError) {
          return
        }
        setBanner("")
        try {
          await onSubmit(values, file)
        } catch (error) {
          applyFieldErrors(error, setError)
          const image = (error as { response?: { data?: ApiErrorBody } }).response?.data?.errors?.image
          if (image) {
            setImageError(Array.isArray(image) ? image.join(" ") : String(image))
          }
          setBanner(formBanner(error))
        }
      })}
    >
      {banner ? <p className="alert alert-danger text-sm">{banner}</p> : null}
      <Input label="SKU" error={errors.sku?.message} {...register("sku")} />
      <Input label="Barcode" error={errors.barcode?.message} {...register("barcode")} />
      <Input label="Name" error={errors.name?.message} {...register("name")} />
      <Textarea label="Description" rows={3} error={errors.description?.message} {...register("description")} />
      <Select label="Category" error={errors.category?.message} {...register("category")}>
        <option value="">Choose a category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select label="Preferred supplier" error={errors.preferred_supplier?.message} {...register("preferred_supplier")}>
        <option value="">None</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.code} {supplier.name}
          </option>
        ))}
      </Select>
      <Input label="Cost price" error={errors.cost_price?.message} {...register("cost_price")} />
      <Input label="Selling price" error={errors.selling_price?.message} {...register("selling_price")} />
      <Input label="Reorder level" error={errors.reorder_level?.message} {...register("reorder_level")} />
      <Select label="Unit" error={errors.unit?.message} {...register("unit")}>
        {PRODUCT_UNITS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <label className="block text-sm">
        <span className="form-label">Image</span>
        {imageUrl ? <img src={imageUrl} alt="" className="mt-2 h-24 w-24 rounded object-cover" /> : null}
        <input
          className="form-control-file mt-1.5"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
        />
        {imageError ? <span className="mt-1 block text-error-600">{imageError}</span> : null}
      </label>
      <Checkbox label="Active" {...register("is_active")} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}

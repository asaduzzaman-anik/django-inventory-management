import type { ProductValues } from "./schemas.ts"
import type { Product } from "./types.ts"

export const emptyProduct: ProductValues = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  category: "",
  preferred_supplier: "",
  cost_price: "",
  selling_price: "",
  reorder_level: "0.000",
  unit: "pcs",
  is_active: true,
}

export function productValues(product: Product): ProductValues {
  return {
    sku: product.sku,
    barcode: product.barcode ?? "",
    name: product.name,
    description: product.description,
    category: String(product.category),
    preferred_supplier: product.preferred_supplier ? String(product.preferred_supplier) : "",
    cost_price: product.cost_price,
    selling_price: product.selling_price,
    reorder_level: product.reorder_level,
    unit: product.unit,
    is_active: product.is_active,
  }
}

export function productPayload(values: ProductValues, file: File | null) {
  if (file) {
    const data = new FormData()
    data.append("sku", values.sku)
    data.append("barcode", values.barcode)
    data.append("name", values.name)
    data.append("description", values.description)
    data.append("category", values.category)
    if (values.preferred_supplier) {
      data.append("preferred_supplier", values.preferred_supplier)
    }
    data.append("cost_price", values.cost_price)
    data.append("selling_price", values.selling_price)
    data.append("reorder_level", values.reorder_level)
    data.append("unit", values.unit)
    data.append("is_active", values.is_active ? "true" : "false")
    data.append("image", file)
    return data
  }
  return {
    sku: values.sku,
    barcode: values.barcode || null,
    name: values.name,
    description: values.description,
    category: Number(values.category),
    preferred_supplier: values.preferred_supplier ? Number(values.preferred_supplier) : null,
    cost_price: values.cost_price,
    selling_price: values.selling_price,
    reorder_level: values.reorder_level,
    unit: values.unit,
    is_active: values.is_active,
  }
}

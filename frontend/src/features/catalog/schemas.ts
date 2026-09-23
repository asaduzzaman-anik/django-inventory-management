import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  slug: z.string(),
  parent: z.string(),
  is_active: z.boolean(),
})

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required."),
  barcode: z.string(),
  name: z.string().trim().min(1, "Name is required."),
  description: z.string(),
  category: z.string().min(1, "Choose a category."),
  preferred_supplier: z.string(),
  cost_price: z.string().trim().min(1, "Cost price is required."),
  selling_price: z.string().trim().min(1, "Selling price is required."),
  reorder_level: z.string().trim().min(1, "Reorder level is required."),
  unit: z.string().min(1, "Choose a unit."),
  is_active: z.boolean(),
})

export type CategoryValues = z.infer<typeof categorySchema>
export type ProductValues = z.infer<typeof productSchema>

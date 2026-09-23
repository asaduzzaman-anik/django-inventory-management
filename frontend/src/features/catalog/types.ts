export type Category = {
  id: number
  name: string
  slug: string
  parent: number | null
  parent_name: string | null
  is_active: boolean
}

export type Product = {
  id: number
  sku: string
  barcode: string | null
  name: string
  description: string
  category: number
  category_name: string
  preferred_supplier: number | null
  preferred_supplier_name: string | null
  cost_price: string
  selling_price: string
  reorder_level: string
  unit: string
  is_active: boolean
  image: string | null
}

export const PRODUCT_UNITS = [
  ["pcs", "Pieces"],
  ["kg", "Kilograms"],
  ["g", "Grams"],
  ["l", "Liters"],
  ["ml", "Milliliters"],
  ["box", "Box"],
  ["pack", "Pack"],
] as const

import { z } from "zod"

export const receiveSchema = z.object({
  warehouse: z.string().min(1, "Choose a warehouse."),
  product: z.string().min(1, "Choose a product."),
  quantity: z.string().trim().refine((value) => Number(value) > 0, "Quantity must be greater than zero."),
  unit_cost: z.string().trim().refine((value) => value !== "" && Number(value) >= 0, "Unit cost cannot be negative."),
  note: z.string(),
})

export const transferSchema = z
  .object({
    source_warehouse: z.string().min(1, "Choose a source warehouse."),
    destination_warehouse: z.string().min(1, "Choose a destination warehouse."),
    product: z.string().min(1, "Choose a product."),
    quantity: z.string().trim().refine((value) => Number(value) > 0, "Quantity must be greater than zero."),
    note: z.string(),
  })
  .refine(
    (value) => !value.source_warehouse || !value.destination_warehouse || value.source_warehouse !== value.destination_warehouse,
    {
      path: ["destination_warehouse"],
      message: "Source and destination must be different warehouses.",
    },
  )

export const adjustmentSchema = z.object({
  warehouse: z.string().min(1, "Choose a warehouse."),
  product: z.string().min(1, "Choose a product."),
  quantity_change: z.string().trim().min(1, "Quantity is required."),
  reason: z.string().min(1, "Choose a reason."),
  note: z.string(),
})

export type ReceiveValues = z.infer<typeof receiveSchema>
export type TransferValues = z.infer<typeof transferSchema>
export type AdjustmentValues = z.infer<typeof adjustmentSchema>

const DECREASE_REASONS = ["DAMAGED", "LOST", "EXPIRED"]

export function adjustmentIssues(values: AdjustmentValues) {
  const issues: Partial<Record<"quantity_change" | "note", string>> = {}
  const qty = Number(values.quantity_change)
  if (Number.isNaN(qty) || qty === 0) {
    issues.quantity_change = "Enter a non-zero quantity."
  } else if (values.reason === "FOUND" && qty < 0) {
    issues.quantity_change = "Found stock must increase on-hand."
  } else if (DECREASE_REASONS.includes(values.reason) && qty > 0) {
    issues.quantity_change = "This reason must decrease on-hand."
  }
  if (values.reason === "OTHER" && !values.note.trim()) {
    issues.note = "A note is required when the reason is OTHER."
  }
  return issues
}

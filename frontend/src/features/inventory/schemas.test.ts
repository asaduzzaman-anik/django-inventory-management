import { describe, expect, it } from "vitest"

import { adjustmentIssues } from "./schemas.ts"

describe("adjustment rules", () => {
  const base = { warehouse: "1", product: "1", quantity_change: "-1", reason: "DAMAGED", note: "" }

  it("rejects a zero change", () => {
    expect(adjustmentIssues({ ...base, quantity_change: "0" }).quantity_change).toBe("Enter a non-zero quantity.")
  })

  it("requires a note for OTHER", () => {
    expect(adjustmentIssues({ ...base, reason: "OTHER", quantity_change: "-1" }).note).toBe(
      "A note is required when the reason is OTHER.",
    )
  })
})

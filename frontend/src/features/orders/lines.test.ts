import { describe, expect, it } from "vitest"

import { lineIssues, type LineDraft } from "./lines.ts"

const line = (patch: Partial<LineDraft> = {}): LineDraft => ({
  key: "1",
  product: "1",
  quantity: "2",
  price: "5",
  ...patch,
})

describe("order lines", () => {
  it("requires a line", () => {
    expect(lineIssues([], "Unit cost")).toBe("Add at least one line.")
  })

  it("rejects a repeated product", () => {
    expect(lineIssues([line(), line({ key: "2" })], "Unit cost")).toBe("Each product can appear only once.")
  })
})

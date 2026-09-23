import { describe, expect, it } from "vitest"

import { documentError } from "./apiError.ts"

describe("document errors", () => {
  it("shows a 409 business-rule detail", () => {
    const error = {
      response: {
        data: {
          code: "business_rule",
          detail: "Insufficient available stock for P13BOLT.",
          errors: {},
        },
      },
    }
    expect(documentError(error)).toBe("Insufficient available stock for P13BOLT.")
  })

  it("shows a line validation message", () => {
    const error = {
      response: {
        data: {
          detail: "Validation failed.",
          errors: { items: ["P13BOLT is inactive."] },
        },
      },
    }
    expect(documentError(error)).toBe("P13BOLT is inactive.")
  })
})

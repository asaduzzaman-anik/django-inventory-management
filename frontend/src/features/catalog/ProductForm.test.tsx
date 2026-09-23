import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ProductForm } from "./ProductForm.tsx"

describe("product form", () => {
  it("rejects an empty SKU", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ProductForm categories={[]} suppliers={[]} submitLabel="Save product" onSubmit={onSubmit} />)
    await user.click(screen.getByRole("button", { name: "Save product" }))
    expect(await screen.findByText("SKU is required.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

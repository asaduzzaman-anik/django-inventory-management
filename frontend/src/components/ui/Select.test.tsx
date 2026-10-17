import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Select } from "./Select.tsx"

describe("searchable select", () => {
  it("filters options and picks a match with the keyboard", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select label="Product" searchable defaultValue="" onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose a product</option>
        <option value="1">SKU-001 Blue widget</option>
        <option value="2">SKU-002 Red gadget</option>
        <option value="3">SKU-003 Green widget</option>
      </Select>,
    )
    await user.click(screen.getByRole("combobox", { name: "Product" }))
    await user.keyboard("gadget")
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["SKU-002 Red gadget"])
    await user.keyboard("{Enter}")
    expect(onChange).toHaveBeenCalledWith("2")
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup()
    render(
      <Select label="Product" searchable defaultValue="">
        <option value="">Choose a product</option>
        <option value="1">SKU-001 Blue widget</option>
      </Select>,
    )
    await user.click(screen.getByRole("combobox", { name: "Product" }))
    await user.keyboard("zzz")
    expect(screen.getByText("No matches")).toBeInTheDocument()
  })
})

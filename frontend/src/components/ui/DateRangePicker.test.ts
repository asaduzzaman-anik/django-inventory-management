import { describe, expect, it } from "vitest"

import { presetRange, toISODate } from "./DateRangePicker.tsx"

describe("date range presets", () => {
  const sunday = new Date(2026, 8, 27)

  it("uses the previous Monday-to-Sunday week", () => {
    expect(presetRange("last_week", sunday)).toEqual({ start: "2026-09-14", end: "2026-09-20" })
  })

  it("uses the previous calendar month", () => {
    expect(presetRange("last_month", sunday)).toEqual({ start: "2026-08-01", end: "2026-08-31" })
  })

  it("uses the previous calendar quarter", () => {
    expect(presetRange("last_quarter", sunday)).toEqual({ start: "2026-04-01", end: "2026-06-30" })
  })

  it("formats a local date without shifting the day", () => {
    expect(toISODate(new Date(2023, 0, 10))).toBe("2023-01-10")
  })
})

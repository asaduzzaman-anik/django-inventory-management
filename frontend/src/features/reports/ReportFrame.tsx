import { useState, type ReactNode } from "react"
import { NavLink } from "react-router-dom"

import { Button } from "../../components/ui/Button.tsx"
import { useCan } from "../auth/useCan.ts"
import { downloadReport } from "./download.ts"

const LINKS = [
  ["/reports/inventory", "Inventory"],
  ["/reports/movements", "Movements"],
  ["/reports/purchases", "Purchases"],
  ["/reports/sales", "Sales"],
] as const

export function ReportFrame({
  title,
  exportName,
  params,
  filters,
  children,
}: {
  title: string
  exportName: string
  params: Record<string, string | undefined>
  filters: ReactNode
  children: ReactNode
}) {
  const canExport = useCan("reports.export_reports")
  const [pending, setPending] = useState<"csv" | "xlsx" | null>(null)
  const [banner, setBanner] = useState("")

  async function exportFile(format: "csv" | "xlsx") {
    setPending(format)
    setBanner("")
    try {
      await downloadReport(exportName, format, params)
    } catch {
      setBanner("Could not download this report.")
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        {canExport ? (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" disabled={pending !== null} onClick={() => exportFile("csv")}>
              {pending === "csv" ? "Saving…" : "Export CSV"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending !== null} onClick={() => exportFile("xlsx")}>
              {pending === "xlsx" ? "Saving…" : "Export Excel"}
            </Button>
          </div>
        ) : null}
      </div>
      <nav className="flex flex-wrap gap-3 text-sm">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "font-medium text-teal-800 underline" : "text-stone-600 hover:underline")}>
            {label}
          </NavLink>
        ))}
      </nav>
      {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
      <div className="flex flex-wrap items-end gap-3">{filters}</div>
      {children}
    </section>
  )
}

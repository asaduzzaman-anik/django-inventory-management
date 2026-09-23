import { api } from "../../api/client.ts"

export async function downloadReport(name: string, format: "csv" | "xlsx", params: Record<string, string | undefined>) {
  const query: Record<string, string> = { format }
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query[key] = value
    }
  }
  const response = await api.get<Blob>(`/reports/${name}/export/`, { params: query, responseType: "blob" })
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${name}.${format}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  return { created_after: localDate(start), created_before: localDate(end) }
}

function localDate(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${value.getFullYear()}-${month}-${day}`
}

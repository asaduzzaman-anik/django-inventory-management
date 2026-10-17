import { api } from "./client.ts"
import type { Page } from "../types/page.ts"

export async function fetchPage<T>(path: string, params: Record<string, string | number | boolean | undefined>) {
  const query: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query[key] = value
    }
  }
  const response = await api.get<Page<T>>(path, { params: query })
  return response.data
}

// Walks every page so option lists aren't cut off at the API's max page size.
export async function fetchAllPages<T>(path: string, params: Record<string, string | number | boolean | undefined>) {
  const first = await fetchPage<T>(path, { ...params, page: 1 })
  const results = [...first.results]
  for (let page = 2; results.length < first.count; page += 1) {
    const next = await fetchPage<T>(path, { ...params, page })
    if (next.results.length === 0) break
    results.push(...next.results)
  }
  return { ...first, next: null, results }
}

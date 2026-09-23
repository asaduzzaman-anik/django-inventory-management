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

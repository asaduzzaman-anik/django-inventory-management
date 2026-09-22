import type { FieldValues, Path, UseFormSetError } from "react-hook-form"

import type { ApiErrorBody } from "../types/api.ts"

export function apiDetail(error: unknown) {
  const body = (error as { response?: { data?: ApiErrorBody } }).response?.data
  return body?.detail ?? "Request failed."
}

export function applyFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  const errors = (error as { response?: { data?: ApiErrorBody } }).response?.data?.errors
  if (!errors) {
    return
  }
  for (const [key, value] of Object.entries(errors)) {
    const message = Array.isArray(value) ? value.join(" ") : String(value)
    setError(key as Path<T>, { message })
  }
}

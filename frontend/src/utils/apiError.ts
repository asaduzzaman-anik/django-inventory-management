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
    if (key === "non_field_errors") {
      continue
    }
    const message = Array.isArray(value) ? value.join(" ") : String(value)
    setError(key as Path<T>, { message })
  }
}

export function formBanner(error: unknown) {
  const body = (error as { response?: { data?: ApiErrorBody } }).response?.data
  const nonField = body?.errors?.non_field_errors
  if (nonField) {
    return Array.isArray(nonField) ? nonField.join(" ") : String(nonField)
  }
  if (body?.detail && body.detail !== "Validation failed.") {
    return body.detail
  }
  return ""
}

export function documentError(error: unknown) {
  const items = (error as { response?: { data?: ApiErrorBody } }).response?.data?.errors?.items
  if (typeof items === "string" && items) {
    return items
  }
  if (Array.isArray(items)) {
    const text = items.filter((item) => typeof item === "string").join(" ")
    if (text) {
      return text
    }
  }
  return formBanner(error)
}

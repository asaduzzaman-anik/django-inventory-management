import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import type { ApiErrorBody } from "../types/api.ts"

const REFRESH_KEY = "inventory.refresh"

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
let onSessionExpired: (() => void) | null = null
let onAccessDenied: (() => void) | null = null
let onToast: ((message: string) => void) | null = null

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
})

export function getAccessToken() {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setRefreshToken(token: string | null) {
  if (token) {
    localStorage.setItem(REFRESH_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_KEY)
  }
}

export function setSessionHandlers(handlers: {
  onSessionExpired?: () => void
  onAccessDenied?: () => void
  onToast?: (message: string) => void
}) {
  onSessionExpired = handlers.onSessionExpired ?? null
  onAccessDenied = handlers.onAccessDenied ?? null
  onToast = handlers.onToast ?? null
}

export function toast(message: string) {
  onToast?.(message)
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

type Retriable = InternalAxiosRequestConfig & { _retry?: boolean }

export function refreshSession() {
  if (!refreshing) {
    refreshing = refreshAccess().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function refreshAccess() {
  const refresh = getRefreshToken()
  if (!refresh) {
    return null
  }
  try {
    const response = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh })
    accessToken = response.data.access
    if (response.data.refresh) {
      setRefreshToken(response.data.refresh)
    }
    return accessToken
  } catch {
    accessToken = null
    setRefreshToken(null)
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as Retriable | undefined
    const url = original?.url ?? ""
    const status = error.response?.status

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !url.includes("/auth/login/") &&
      !url.includes("/auth/refresh/")
    ) {
      original._retry = true
      const next = await refreshSession()
      if (next) {
        original.headers.Authorization = `Bearer ${next}`
        return api(original)
      }
      onSessionExpired?.()
      return Promise.reject(error)
    }

    if (status === 403 && !url.includes("/auth/")) {
      onAccessDenied?.()
      return Promise.reject(error)
    }

    const fieldErrors = error.response?.data?.errors ?? {}
    const detail = error.response?.data?.detail
    if (status && status !== 401 && !Object.keys(fieldErrors).length && detail) {
      toast(detail)
    }
    return Promise.reject(error)
  },
)

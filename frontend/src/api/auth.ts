import { api, getRefreshToken, setAccessToken, setRefreshToken } from "./client.ts"
import type { CurrentUser, LoginResponse } from "../types/api.ts"

export async function loginRequest(username: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login/", { username, password })
  setAccessToken(response.data.access)
  setRefreshToken(response.data.refresh)
  return response.data
}

export async function fetchMe() {
  const response = await api.get<CurrentUser>("/auth/me/")
  return response.data
}

export async function logoutRequest() {
  const refresh = getRefreshToken()
  try {
    if (refresh) {
      await api.post("/auth/logout/", { refresh })
    }
  } finally {
    setAccessToken(null)
    setRefreshToken(null)
  }
}

export async function updateProfile(payload: Pick<CurrentUser, "email" | "first_name" | "last_name" | "phone">) {
  const response = await api.patch<CurrentUser>("/auth/me/", payload)
  return response.data
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api.post("/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword,
  })
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { fetchMe, loginRequest, logoutRequest } from "../../api/auth.ts"
import { getRefreshToken, refreshSession, setAccessToken, setRefreshToken } from "../../api/client.ts"
import type { CurrentUser } from "../../types/api.ts"

type AuthContextValue = {
  user: CurrentUser | null
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: CurrentUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (!getRefreshToken()) {
        if (!cancelled) {
          setReady(true)
        }
        return
      }
      const access = await refreshSession()
      if (!access) {
        if (!cancelled) {
          setReady(true)
        }
        return
      }
      try {
        const me = await fetchMe()
        if (!cancelled) {
          setUser(me)
        }
      } catch {
        setAccessToken(null)
        setRefreshToken(null)
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      setUser,
      async login(username, password) {
        await loginRequest(username, password)
        setUser(await fetchMe())
      },
      async logout() {
        await logoutRequest()
        setUser(null)
      },
    }),
    [ready, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return value
}

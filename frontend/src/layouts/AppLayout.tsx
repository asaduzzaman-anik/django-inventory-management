import { useEffect, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { setSessionHandlers } from "../api/client.ts"
import { Toast } from "../components/Toast.tsx"
import { useAuth } from "../features/auth/AuthContext.tsx"
import { NAV_ITEMS, canSee } from "./nav.ts"

export function AppLayout() {
  const { user, logout, setUser } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")

  useEffect(() => {
    setSessionHandlers({
      onSessionExpired: () => {
        setUser(null)
        navigate("/login", { replace: true })
      },
      onAccessDenied: () => navigate("/access-denied", { replace: true }),
      onToast: setMessage,
    })
  }, [navigate, setUser])

  useEffect(() => {
    if (!message) {
      return
    }
    const timer = window.setTimeout(() => setMessage(""), 4000)
    return () => window.clearTimeout(timer)
  }, [message])

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username

  async function onLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-100 md:flex">
      <aside className="bg-stone-900 text-stone-200 md:w-60 md:shrink-0">
        <div className="px-4 py-5 text-sm font-semibold tracking-wide text-white">Inventory</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:block md:space-y-1 md:px-2">
          {NAV_ITEMS.filter((item) => user && canSee(user, item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm whitespace-nowrap ${isActive ? "bg-stone-700 text-white" : "text-stone-300 hover:bg-stone-800"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-stone-200 bg-white px-4 py-3">
          <NavLink className="text-sm text-stone-700 hover:underline" to="/profile">
            {displayName}
          </NavLink>
          <button className="text-sm text-teal-800" type="button" onClick={onLogout}>
            Log out
          </button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      {message ? <Toast message={message} onClose={() => setMessage("")} /> : null}
    </div>
  )
}

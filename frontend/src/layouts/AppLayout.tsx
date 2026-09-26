import { useEffect, useRef, useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { setSessionHandlers } from "../api/client.ts"
import { Toast } from "../components/Toast.tsx"
import { useAuth } from "../features/auth/AuthContext.tsx"
import { NotificationMenu } from "../features/notifications/NotificationMenu.tsx"
import { NAV_ITEMS, canSee } from "./nav.ts"

const ICONS: Record<string, string> = {
  "/": "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z",
  "/products": "M21 8.5 12 3 3 8.5 12 14l9-5.5ZM3 8.5V16l9 5 9-5V8.5",
  "/categories": "M4 6h16M4 12h16M4 18h10",
  "/suppliers": "M3 21V8l9-5 9 5v13M9 21v-6h6v6",
  "/warehouses": "M3 10 12 3l9 7v11H3V10Zm6 11v-5h6v5",
  "/inventory": "M4 7h16v12H4V7Zm0 4h16M9 7V4h6v3",
  "/purchasing": "M6 6h15l-1.5 9h-12L6 6ZM6 6 5 3H2M9 20h.01M17 20h.01",
  "/sales": "M4 19V5M4 19h16M8 15l3-4 3 2 4-6",
  "/reports": "M5 19V9M12 19V5M19 19v-7",
  "/admin": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0",
}

export function AppLayout() {
  const { user, logout, setUser } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem("sidebarCollapsed") === "true")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.username || "User"
  const initial = displayName.slice(0, 1).toUpperCase()

  async function onLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  function toggleSidebar() {
    if (window.innerWidth < 1024) {
      setMobileOpen((open) => !open)
      return
    }
    setCollapsed((value) => {
      const next = !value
      window.localStorage.setItem("sidebarCollapsed", String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-body">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-9 bg-gray-900/50 lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`sidebar fixed top-0 left-0 z-10 flex h-screen w-[290px] flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 ease-in-out lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "app-sidebar-minified lg:w-[85px]" : "lg:w-[290px]"}`}
      >
        <div className="flex h-[100px] items-center justify-center px-6 py-5">
          <NavLink to="/" className="text-xl font-bold text-primary" onClick={() => setMobileOpen(false)}>
            {collapsed ? "I" : "Inventory"}
          </NavLink>
        </div>
        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-4">
          <h3 className="menu-group-heading mb-4 px-5 text-xs font-medium tracking-wide text-gray-500 uppercase">Menu</h3>
          <ul className="mb-6 flex flex-col space-y-1">
            {NAV_ITEMS.filter((item) => user && canSee(user, item.permission)).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={"end" in item ? item.end : false}
                  title={item.label}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `menu-item group w-full ${isActive ? "menu-item-active" : ""}`}
                >
                  <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[item.to]} />
                  </svg>
                  <span className="menu-item-text">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-body">
        <header className="sticky top-0 z-9 flex w-full items-center justify-between border-b border-gray-200 bg-white lg:px-6">
          <div className="flex items-center gap-2 px-3 py-2 lg:px-0">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
              aria-label="Toggle sidebar"
              onClick={toggleSidebar}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-1 px-3 lg:px-0">
            <NotificationMenu />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className="flex items-center rounded-full p-1 text-gray-700 hover:bg-gray-100"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-500">
                  {initial}
                </span>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-99 mt-3 flex w-[220px] flex-col rounded-md border border-gray-200 bg-white p-3 shadow-theme-lg">
                  <div className="mb-2 border-b border-gray-200 pb-2">
                    <span className="block font-medium text-gray-700">{displayName}</span>
                    <span className="mt-0.5 block text-sm text-gray-500">{user?.email}</span>
                  </div>
                  <NavLink
                    to="/profile"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </NavLink>
                  <button
                    type="button"
                    className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={onLogout}
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      {message ? <Toast message={message} onClose={() => setMessage("")} /> : null}
    </div>
  )
}

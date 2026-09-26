import { NavLink } from "react-router-dom"

const LINKS = [
  ["/admin/users", "Users"],
  ["/admin/audit-logs", "Audit log"],
] as const

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {LINKS.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 font-medium ${isActive ? "bg-brand-100 text-brand-500" : "text-gray-600 hover:bg-gray-100"}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

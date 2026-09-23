import { NavLink } from "react-router-dom"

const LINKS = [
  ["/admin/users", "Users"],
  ["/admin/audit-logs", "Audit log"],
] as const

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {LINKS.map(([to, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "font-medium text-teal-800 underline" : "text-stone-600 hover:underline")}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

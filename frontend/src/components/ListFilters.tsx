import type { ReactNode } from "react"

import { Select } from "./ui/Select.tsx"

export function ListFilters({
  search,
  onSearch,
  active,
  onActive,
  extra,
  action,
}: {
  search: string
  onSearch: (value: string) => void
  active: string
  onActive: (value: string) => void
  extra?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="font-medium text-stone-700">Search</span>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="mt-1 w-56 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-800"
        />
      </label>
      <div className="w-40">
        <Select label="Status" value={active} onChange={(event) => onActive(event.target.value)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </Select>
      </div>
      {extra}
      <div className="ml-auto">{action}</div>
    </div>
  )
}

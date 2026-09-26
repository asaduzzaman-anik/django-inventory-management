import type { ReactNode } from "react"

import { SearchField } from "./ui/SearchField.tsx"
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
    <div className="filter-toolbar">
      <SearchField value={search} onChange={onSearch} className="md:w-80" />
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select label="Status" value={active} onChange={(event) => onActive(event.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">All</option>
          </Select>
        </div>
        {extra}
        {action}
      </div>
    </div>
  )
}

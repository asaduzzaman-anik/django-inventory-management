import type { ReactNode } from "react"

import { FilterDropdown } from "./ui/FilterDropdown.tsx"
import { SearchField } from "./ui/SearchField.tsx"

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
      <SearchField value={search} onChange={onSearch} />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <FilterDropdown
          label="Status"
          value={active}
          onChange={onActive}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        {extra}
        {action}
      </div>
    </div>
  )
}

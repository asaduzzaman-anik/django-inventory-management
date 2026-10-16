import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { DateRangePicker } from "../../components/ui/DateRangePicker.tsx"
import { FilterDropdown } from "../../components/ui/FilterDropdown.tsx"
import { SearchField } from "../../components/ui/SearchField.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { formatWhen } from "../inventory/types.ts"
import { AdminNav } from "./adminNav.tsx"
import { AUDIT_ACTIONS, type AuditLog } from "./types.ts"

export function AuditLogPage() {
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [action, setAction] = useState("")
  const [createdAfter, setCreatedAfter] = useState("")
  const [createdBefore, setCreatedBefore] = useState("")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim()
      setAppliedSearch((current) => {
        if (current !== next) {
          setPage(1)
        }
        return next
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const query = useQuery({
    queryKey: ["audit-logs", appliedSearch, action, createdAfter, createdBefore, page],
    queryFn: () =>
      fetchPage<AuditLog>("/audit-logs/", {
        search: appliedSearch || undefined,
        action: action || undefined,
        created_after: createdAfter || undefined,
        created_before: createdBefore ? `${createdBefore}T23:59:59` : undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  return (
    <section className="space-y-4">
      <h1 className="page-title">Audit log</h1>
      <AdminNav />
      <div className="filter-toolbar">
        <SearchField value={search} onChange={setSearch} placeholder="Search user, entity, record..." />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <FilterDropdown
            label="Action"
            value={action}
            onChange={(value) => { setAction(value); setPage(1) }}
            options={AUDIT_ACTIONS.map((value) => ({ value, label: value }))}
          />
          <DateRangePicker
            start={createdAfter}
            end={createdBefore}
            onChange={(start, end) => {
              setCreatedAfter(start)
              setCreatedBefore(end)
              setPage(1)
            }}
          />
        </div>
      </div>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={(query.data?.results.length ?? 0) === 0}
        emptyTitle="No audit entries"
        emptyMessage="Nothing matches the current search and filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          columns={[
            { key: "when", header: "When", render: (row) => formatWhen(row.created_at) },
            { key: "user", header: "User", render: (row) => row.username ?? "—" },
            { key: "action", header: "Action", render: (row) => row.action },
            { key: "entity", header: "Entity", render: (row) => row.entity_type },
            { key: "repr", header: "Record", render: (row) => row.entity_repr || row.entity_id },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

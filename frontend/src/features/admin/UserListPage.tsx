import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Badge } from "../../components/ui/Badge.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { FilterDropdown } from "../../components/ui/FilterDropdown.tsx"
import { SearchField } from "../../components/ui/SearchField.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { AdminNav } from "./adminNav.tsx"
import { ROLES, type AdminUser } from "./types.ts"

export function UserListPage() {
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [role, setRole] = useState("")
  const [active, setActive] = useState("")
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
    queryKey: ["users", appliedSearch, role, active, page],
    queryFn: () =>
      fetchPage<AdminUser>("/users/", {
        search: appliedSearch,
        role: role || undefined,
        is_active: active || undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Users</h1>
        <Link className="btn-primary" to="/admin/users/new">
          New user
        </Link>
      </div>
      <AdminNav />
      <div className="filter-toolbar">
        <SearchField value={search} onChange={setSearch} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <FilterDropdown
            label="Role"
            value={role}
            onChange={(value) => { setRole(value); setPage(1) }}
            options={ROLES.map((name) => ({ value: name, label: name }))}
          />
          <FilterDropdown
            label="Status"
            value={active}
            onChange={(value) => { setActive(value); setPage(1) }}
            options={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>
      </div>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={(query.data?.results.length ?? 0) === 0}
        emptyTitle="No users"
        emptyMessage="Nothing matches the current search and filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "username",
              header: "Username",
              render: (row) => (
                <Link className="link" to={`/admin/users/${row.id}`}>
                  {row.username}
                </Link>
              ),
            },
            { key: "email", header: "Email", render: (row) => row.email },
            { key: "role", header: "Role", render: (row) => row.role ?? "—" },
            { key: "active", header: "Status", render: (row) => <Badge>{row.is_active ? "Active" : "Inactive"}</Badge> },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Badge } from "../../components/ui/Badge.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { SearchField } from "../../components/ui/SearchField.tsx"
import { Select } from "../../components/ui/Select.tsx"
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
        <div className="w-52">
          <Select label="Role" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}>
            <option value="">All</option>
            {ROLES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select label="Status" value={active} onChange={(event) => { setActive(event.target.value); setPage(1) }}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
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

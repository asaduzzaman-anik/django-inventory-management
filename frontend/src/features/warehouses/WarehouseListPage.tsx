import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { ListFilters } from "../../components/ListFilters.tsx"
import { QueryState } from "../../components/QueryState.tsx"
import { Badge } from "../../components/ui/Badge.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { useListState } from "../../hooks/useListState.ts"
import { useCan } from "../auth/useCan.ts"
import type { Warehouse } from "./types.ts"

export function WarehouseListPage() {
  const canAdd = useCan("warehouses.add_warehouse")
  const list = useListState()
  const query = useQuery({
    queryKey: ["warehouses", list.appliedSearch, list.active, list.page, list.ordering],
    queryFn: () =>
      fetchPage<Warehouse>("/warehouses/", {
        search: list.appliedSearch,
        is_active: list.active || undefined,
        page: list.page,
        ordering: list.ordering,
      }),
    placeholderData: keepPreviousData,
  })

  return (
    <section>
      <h1 className="mb-4 page-title">Warehouses</h1>
      <ListFilters
        search={list.search}
        onSearch={list.setSearch}
        active={list.active}
        onActive={list.setActive}
        action={
          canAdd ? (
            <Link className="btn-primary" to="/warehouses/new">
              New warehouse
            </Link>
          ) : null
        }
      />
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={!query.data?.results.length}
        emptyTitle="No warehouses"
        emptyMessage="Nothing matches the current search and status filter."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          ordering={list.ordering}
          onSort={list.toggleOrdering}
          columns={[
            {
              key: "code",
              header: "Code",
              sortKey: "code",
              render: (row) => (
                <Link className="link" to={`/warehouses/${row.id}`}>
                  {row.code}
                </Link>
              ),
            },
            { key: "name", header: "Name", sortKey: "name", render: (row) => row.name },
            { key: "city", header: "City", render: (row) => row.city || "—" },
            { key: "active", header: "Status", render: (row) => <Badge>{row.is_active ? "Active" : "Inactive"}</Badge> },
          ]}
        />
        <Pagination page={list.page} count={query.data?.count ?? 0} onPage={list.setPage} />
      </QueryState>
    </section>
  )
}

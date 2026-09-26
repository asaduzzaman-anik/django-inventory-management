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
import { useCan } from "../auth/useCan.ts"
import { PO_STATUSES, purchaseStatusLabel, type PurchaseOrder } from "./types.ts"

export function PurchaseListPage() {
  const canAdd = useCan("purchasing.add_purchaseorder")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [status, setStatus] = useState("")
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
    queryKey: ["purchase-orders", appliedSearch, status, page],
    queryFn: () =>
      fetchPage<PurchaseOrder>("/purchase-orders/", {
        search: appliedSearch,
        status: status || undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Purchasing</h1>
        {canAdd ? (
          <Link className="btn-primary" to="/purchasing/new">
            New purchase order
          </Link>
        ) : null}
      </div>
      <div className="filter-toolbar">
        <SearchField value={search} onChange={setSearch} />
        <FilterDropdown
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
          options={PO_STATUSES.map(([value, label]) => ({ value, label }))}
        />
      </div>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={!query.data?.results.length}
        emptyTitle="No purchase orders"
        emptyMessage="Nothing matches the current search and status."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          columns={[
            {
              key: "number",
              header: "Number",
              render: (row) => (
                <Link className="link" to={`/purchasing/${row.id}`}>
                  {row.number}
                </Link>
              ),
            },
            { key: "supplier", header: "Supplier", render: (row) => row.supplier_name },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "status", header: "Status", render: (row) => <Badge>{purchaseStatusLabel(row.status)}</Badge> },
            { key: "total", header: "Total", render: (row) => row.total },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

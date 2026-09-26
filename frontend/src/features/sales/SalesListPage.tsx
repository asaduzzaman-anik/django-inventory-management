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
import { paymentLabel, SALES_STATUSES, salesStatusLabel, type SalesOrder } from "./types.ts"

export function SalesListPage() {
  const canAdd = useCan("sales.add_salesorder")
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
    queryKey: ["sales-orders", appliedSearch, status, page],
    queryFn: () =>
      fetchPage<SalesOrder>("/sales-orders/", {
        search: appliedSearch,
        status: status || undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Sales</h1>
        {canAdd ? (
          <Link className="btn-primary" to="/sales/new">
            New sales order
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
          options={SALES_STATUSES.map(([value, label]) => ({ value, label }))}
        />
      </div>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={!query.data?.results.length}
        emptyTitle="No sales orders"
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
                <Link className="link" to={`/sales/${row.id}`}>
                  {row.number}
                </Link>
              ),
            },
            { key: "customer", header: "Customer", render: (row) => row.customer_name },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "status", header: "Status", render: (row) => <Badge>{salesStatusLabel(row.status)}</Badge> },
            { key: "payment", header: "Payment", render: (row) => <Badge>{paymentLabel(row.payment_status)}</Badge> },
            { key: "total", header: "Total", render: (row) => row.total },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

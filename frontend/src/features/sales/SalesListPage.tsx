import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
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
        <h1 className="text-2xl font-semibold text-stone-900">Sales</h1>
        {canAdd ? (
          <Link className="inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white" to="/sales/new">
            New sales order
          </Link>
        ) : null}
      </div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="font-medium text-stone-700">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 w-56 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-800"
          />
        </label>
        <div className="w-48">
          <Select
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
          >
            <option value="">All</option>
            {SALES_STATUSES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
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
                <Link className="text-teal-800 underline" to={`/sales/${row.id}`}>
                  {row.number}
                </Link>
              ),
            },
            { key: "customer", header: "Customer", render: (row) => row.customer_name },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "status", header: "Status", render: (row) => salesStatusLabel(row.status) },
            { key: "payment", header: "Payment", render: (row) => paymentLabel(row.payment_status) },
            { key: "total", header: "Total", render: (row) => row.total },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

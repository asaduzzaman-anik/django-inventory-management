import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Table } from "../../components/ui/Table.tsx"
import type { Category } from "../catalog/types.ts"
import { useCan } from "../auth/useCan.ts"
import type { Warehouse } from "../warehouses/types.ts"
import { STOCK_STATUSES, stockStatusLabel, type StockRow } from "./types.ts"

export function StockListPage() {
  const canReceive = useCan("inventory.receive_stock")
  const canTransfer = useCan("inventory.transfer_stock")
  const canAdjust = useCan("inventory.adjust_stock")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [warehouse, setWarehouse] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [ordering, setOrdering] = useState("")

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

  const warehouses = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { page_size: 100, ordering: "name" }),
  })
  const categories = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => fetchPage<Category>("/categories/", { page_size: 100, ordering: "name" }),
  })
  const query = useQuery({
    queryKey: ["stock", appliedSearch, warehouse, category, status, page, ordering],
    queryFn: () =>
      fetchPage<StockRow>("/stock/", {
        search: appliedSearch,
        warehouse: warehouse || undefined,
        category: category || undefined,
        status: status || undefined,
        page,
        ordering: ordering || undefined,
      }),
    placeholderData: keepPreviousData,
  })

  function choose(setter: (value: string) => void, value: string) {
    setter(value)
    setPage(1)
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">Inventory</h1>
        <div className="flex flex-wrap gap-2">
          {canReceive ? <ActionLink to="/inventory/receive">Receive</ActionLink> : null}
          {canTransfer ? <ActionLink to="/inventory/transfer">Transfer</ActionLink> : null}
          {canAdjust ? <ActionLink to="/inventory/adjust">Adjust</ActionLink> : null}
          <Link className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800 ring-1 ring-stone-300" to="/inventory/transactions">
            History
          </Link>
        </div>
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
          <Select label="Warehouse" value={warehouse} onChange={(event) => choose(setWarehouse, event.target.value)}>
            <option value="">All</option>
            {(warehouses.data?.results ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select label="Category" value={category} onChange={(event) => choose(setCategory, event.target.value)}>
            <option value="">All</option>
            {(categories.data?.results ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select label="Status" value={status} onChange={(event) => choose(setStatus, event.target.value)}>
            <option value="">All</option>
            {STOCK_STATUSES.map(([value, label]) => (
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
        emptyTitle="No stock"
        emptyMessage="Nothing matches the current filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          ordering={ordering}
          onSort={(key) => {
            setOrdering((current) => (current === key ? `-${key}` : key))
            setPage(1)
          }}
          columns={[
            { key: "sku", header: "SKU", render: (row) => row.sku },
            { key: "product", header: "Product", render: (row) => row.product_name },
            { key: "warehouse", header: "Warehouse", render: (row) => `${row.warehouse_code} ${row.warehouse_name}` },
            { key: "on_hand", header: "On hand", sortKey: "on_hand", render: (row) => row.on_hand },
            { key: "reserved", header: "Reserved", render: (row) => row.reserved },
            { key: "available", header: "Available", sortKey: "available", render: (row) => row.available },
            { key: "status", header: "Status", render: (row) => stockStatusLabel(row.status) },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

function ActionLink({ to, children }: { to: string; children: string }) {
  return (
    <Link className="inline-block rounded-md bg-teal-800 px-4 py-2 text-sm font-medium text-white" to={to}>
      {children}
    </Link>
  )
}

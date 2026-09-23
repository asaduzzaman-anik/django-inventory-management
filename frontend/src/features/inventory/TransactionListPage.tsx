import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { documentPath, formatWhen, TRANSACTION_TYPES, transactionLabel, type InventoryTransaction } from "./types.ts"

export function TransactionListPage() {
  const [type, setType] = useState("")
  const [after, setAfter] = useState("")
  const [before, setBefore] = useState("")
  const [page, setPage] = useState(1)
  const query = useQuery({
    queryKey: ["transactions", type, after, before, page],
    queryFn: () =>
      fetchPage<InventoryTransaction>("/inventory-transactions/", {
        transaction_type: type || undefined,
        created_after: after || undefined,
        created_before: before ? `${before}T23:59:59` : undefined,
        page,
      }),
    placeholderData: keepPreviousData,
  })

  function chooseType(value: string) {
    setType(value)
    setPage(1)
  }

  return (
    <section>
      <Link className="text-sm text-teal-800 underline" to="/inventory">
        Inventory
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-semibold text-stone-900">Transaction history</h1>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select label="Type" value={type} onChange={(event) => chooseType(event.target.value)}>
            <option value="">All</option>
            {TRANSACTION_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">From</span>
          <input
            type="date"
            value={after}
            onChange={(event) => {
              setAfter(event.target.value)
              setPage(1)
            }}
            className="mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-800"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-700">To</span>
          <input
            type="date"
            value={before}
            onChange={(event) => {
              setBefore(event.target.value)
              setPage(1)
            }}
            className="mt-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-800"
          />
        </label>
      </div>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={!query.data?.results.length}
        emptyTitle="No transactions"
        emptyMessage="Nothing matches the current type and date filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => row.id}
          columns={[
            { key: "when", header: "When", render: (row) => formatWhen(row.created_at) },
            { key: "type", header: "Type", render: (row) => transactionLabel(row.transaction_type) },
            { key: "sku", header: "SKU", render: (row) => row.sku },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "change", header: "Change", render: (row) => row.quantity_change },
            { key: "balance", header: "Balance", render: (row) => row.balance_after },
            {
              key: "reference",
              header: "Document",
              render: (row) => {
                const path = documentPath(row.reference_type, row.reference_id)
                if (!path || !row.reference_code) {
                  return row.reference_code || "—"
                }
                return (
                  <Link className="text-teal-800 underline" to={path}>
                    {row.reference_code}
                  </Link>
                )
              },
            },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </section>
  )
}

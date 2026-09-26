import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link } from "react-router-dom"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { DateRangePicker } from "../../components/ui/DateRangePicker.tsx"
import { FilterDropdown } from "../../components/ui/FilterDropdown.tsx"
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
      <Link className="text-sm link" to="/inventory">
        Inventory
      </Link>
      <h1 className="mb-4 mt-2 page-title">Transaction history</h1>
      <div className="filter-toolbar">
        <FilterDropdown
          label="Type"
          value={type}
          onChange={chooseType}
          options={TRANSACTION_TYPES.map(([value, label]) => ({ value, label }))}
        />
        <DateRangePicker
          start={after}
          end={before}
          onChange={(nextStart, nextEnd) => {
            setAfter(nextStart)
            setBefore(nextEnd)
            setPage(1)
          }}
        />
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
                  <Link className="link" to={path}>
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

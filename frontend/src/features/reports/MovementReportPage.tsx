import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { TRANSACTION_TYPES, formatWhen, transactionLabel } from "../inventory/types.ts"
import type { Warehouse } from "../warehouses/types.ts"
import { defaultDateRange } from "./download.ts"
import { ReportFrame } from "./ReportFrame.tsx"

type MovementRow = {
  created_at: string
  transaction_type: string
  sku: string
  warehouse_code: string
  quantity_change: string
  balance_after: string
  reference_code: string
}

export function MovementReportPage() {
  const initial = defaultDateRange()
  const [warehouse, setWarehouse] = useState("")
  const [type, setType] = useState("")
  const [createdAfter, setCreatedAfter] = useState(initial.created_after)
  const [createdBefore, setCreatedBefore] = useState(initial.created_before)
  const [page, setPage] = useState(1)
  const params = {
    warehouse: warehouse || undefined,
    transaction_type: type || undefined,
    created_after: createdAfter || undefined,
    created_before: createdBefore ? `${createdBefore}T23:59:59` : undefined,
  }
  const warehouses = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { page_size: 100, ordering: "name" }),
  })
  const query = useQuery({
    queryKey: ["reports", "movements", warehouse, type, createdAfter, createdBefore, page],
    queryFn: () => fetchPage<MovementRow>("/reports/stock-movements/", { ...params, page }),
    enabled: Boolean(createdAfter && createdBefore),
    placeholderData: keepPreviousData,
  })

  return (
    <ReportFrame
      title="Movement report"
      exportName="stock-movements"
      params={params}
      filters={
        <>
          <div className="w-52">
            <Select label="Warehouse" value={warehouse} onChange={(event) => { setWarehouse(event.target.value); setPage(1) }}>
              <option value="">All</option>
              {(warehouses.data?.results ?? []).map((row) => (
                <option key={row.id} value={row.id}>{row.code} {row.name}</option>
              ))}
            </Select>
          </div>
          <div className="w-52">
            <Select label="Type" value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}>
              <option value="">All</option>
              {TRANSACTION_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <Input label="From" type="date" value={createdAfter} onChange={(event) => { setCreatedAfter(event.target.value); setPage(1) }} />
          <Input label="To" type="date" value={createdBefore} onChange={(event) => { setCreatedBefore(event.target.value); setPage(1) }} />
        </>
      }
    >
      <QueryState
        isPending={Boolean(createdAfter && createdBefore) && query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={(query.data?.results.length ?? 0) === 0}
        emptyTitle="No movements"
        emptyMessage="Nothing matches the current dates and filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => `${row.created_at}-${row.reference_code}-${row.sku}-${row.warehouse_code}-${row.quantity_change}`}
          columns={[
            { key: "when", header: "Created", render: (row) => formatWhen(row.created_at) },
            { key: "type", header: "Type", render: (row) => transactionLabel(row.transaction_type) },
            { key: "sku", header: "SKU", render: (row) => row.sku },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "quantity", header: "Quantity", render: (row) => row.quantity_change },
            { key: "balance", header: "Balance", render: (row) => row.balance_after },
            { key: "reference", header: "Reference", render: (row) => row.reference_code },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </ReportFrame>
  )
}

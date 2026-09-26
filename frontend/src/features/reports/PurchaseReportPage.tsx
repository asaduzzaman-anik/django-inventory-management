import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { DateRangePicker } from "../../components/ui/DateRangePicker.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { FilterDropdown } from "../../components/ui/FilterDropdown.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { formatWhen } from "../inventory/types.ts"
import type { Supplier } from "../suppliers/types.ts"
import type { Warehouse } from "../warehouses/types.ts"
import { defaultDateRange } from "./download.ts"
import { ReportFrame } from "./ReportFrame.tsx"

type PurchaseRow = {
  received_at: string
  number: string
  purchase_order: string
  supplier: string
  warehouse_code: string
  sku: string
  quantity: string
  unit_cost: string
  line_total: string
}

export function PurchaseReportPage() {
  const initial = defaultDateRange()
  const [warehouse, setWarehouse] = useState("")
  const [supplier, setSupplier] = useState("")
  const [createdAfter, setCreatedAfter] = useState(initial.created_after)
  const [createdBefore, setCreatedBefore] = useState(initial.created_before)
  const [page, setPage] = useState(1)
  const params = {
    warehouse: warehouse || undefined,
    supplier: supplier || undefined,
    created_after: createdAfter || undefined,
    created_before: createdBefore ? `${createdBefore}T23:59:59` : undefined,
  }
  const warehouses = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { page_size: 100, ordering: "name" }),
  })
  const suppliers = useQuery({
    queryKey: ["suppliers", "options"],
    queryFn: () => fetchPage<Supplier>("/suppliers/", { page_size: 100, ordering: "name" }),
  })
  const ready = Boolean(createdAfter && createdBefore)
  const query = useQuery({
    queryKey: ["reports", "purchases", warehouse, supplier, createdAfter, createdBefore, page],
    queryFn: () => fetchPage<PurchaseRow>("/reports/purchases/", { ...params, page }),
    enabled: ready,
    placeholderData: keepPreviousData,
  })

  return (
    <ReportFrame
      title="Purchase report"
      exportName="purchases"
      params={params}
      filters={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <FilterDropdown
            label="Warehouse"
            value={warehouse}
            onChange={(value) => { setWarehouse(value); setPage(1) }}
            options={(warehouses.data?.results ?? []).map((row) => ({ value: String(row.id), label: `${row.code} ${row.name}` }))}
          />
          <FilterDropdown
            label="Supplier"
            value={supplier}
            onChange={(value) => { setSupplier(value); setPage(1) }}
            options={(suppliers.data?.results ?? []).map((row) => ({ value: String(row.id), label: `${row.code} ${row.name}` }))}
          />
          <DateRangePicker
            start={createdAfter}
            end={createdBefore}
            onChange={(start, end) => {
              setCreatedAfter(start)
              setCreatedBefore(end)
              setPage(1)
            }}
          />
        </div>
      }
    >
      <QueryState
        isPending={ready && query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={(query.data?.results.length ?? 0) === 0}
        emptyTitle="No purchase receipts"
        emptyMessage="Nothing matches the current dates and filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => `${row.number}-${row.sku}-${row.quantity}`}
          columns={[
            { key: "when", header: "Received", render: (row) => formatWhen(row.received_at) },
            { key: "number", header: "Receipt", render: (row) => row.number },
            { key: "order", header: "Purchase order", render: (row) => row.purchase_order },
            { key: "supplier", header: "Supplier", render: (row) => row.supplier },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "sku", header: "SKU", render: (row) => row.sku },
            { key: "quantity", header: "Quantity", render: (row) => row.quantity },
            { key: "cost", header: "Unit cost", render: (row) => row.unit_cost },
            { key: "total", header: "Line total", render: (row) => row.line_total },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </ReportFrame>
  )
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { DateRangePicker } from "../../components/ui/DateRangePicker.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { FilterDropdown } from "../../components/ui/FilterDropdown.tsx"
import { Table } from "../../components/ui/Table.tsx"
import { formatWhen } from "../inventory/types.ts"
import type { Warehouse } from "../warehouses/types.ts"
import { defaultDateRange } from "./download.ts"
import { ReportFrame } from "./ReportFrame.tsx"

type SalesRow = {
  completed_at: string
  number: string
  customer_name: string
  warehouse_code: string
  sku: string
  quantity: string
  unit_price: string
  line_total: string
}

export function SalesReportPage() {
  const initial = defaultDateRange()
  const [warehouse, setWarehouse] = useState("")
  const [createdAfter, setCreatedAfter] = useState(initial.created_after)
  const [createdBefore, setCreatedBefore] = useState(initial.created_before)
  const [page, setPage] = useState(1)
  const params = {
    warehouse: warehouse || undefined,
    created_after: createdAfter || undefined,
    created_before: createdBefore ? `${createdBefore}T23:59:59` : undefined,
  }
  const warehouses = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { page_size: 100, ordering: "name" }),
  })
  const ready = Boolean(createdAfter && createdBefore)
  const query = useQuery({
    queryKey: ["reports", "sales", warehouse, createdAfter, createdBefore, page],
    queryFn: () => fetchPage<SalesRow>("/reports/sales/", { ...params, page }),
    enabled: ready,
    placeholderData: keepPreviousData,
  })

  return (
    <ReportFrame
      title="Sales report"
      exportName="sales"
      params={params}
      filters={
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <FilterDropdown
            label="Warehouse"
            value={warehouse}
            onChange={(value) => { setWarehouse(value); setPage(1) }}
            options={(warehouses.data?.results ?? []).map((row) => ({ value: String(row.id), label: `${row.code} ${row.name}` }))}
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
        emptyTitle="No completed sales"
        emptyMessage="Nothing matches the current dates and filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => `${row.number}-${row.sku}-${row.quantity}`}
          columns={[
            { key: "when", header: "Completed", render: (row) => formatWhen(row.completed_at) },
            { key: "number", header: "Order", render: (row) => row.number },
            { key: "customer", header: "Customer", render: (row) => row.customer_name },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "sku", header: "SKU", render: (row) => row.sku },
            { key: "quantity", header: "Quantity", render: (row) => row.quantity },
            { key: "price", header: "Unit price", render: (row) => row.unit_price },
            { key: "total", header: "Line total", render: (row) => row.line_total },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </ReportFrame>
  )
}

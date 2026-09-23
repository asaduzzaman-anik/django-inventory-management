import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
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
        <>
          <div className="w-52">
            <Select label="Warehouse" value={warehouse} onChange={(event) => { setWarehouse(event.target.value); setPage(1) }}>
              <option value="">All</option>
              {(warehouses.data?.results ?? []).map((row) => (
                <option key={row.id} value={row.id}>{row.code} {row.name}</option>
              ))}
            </Select>
          </div>
          <Input label="From" type="date" value={createdAfter} onChange={(event) => { setCreatedAfter(event.target.value); setPage(1) }} />
          <Input label="To" type="date" value={createdBefore} onChange={(event) => { setCreatedBefore(event.target.value); setPage(1) }} />
        </>
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

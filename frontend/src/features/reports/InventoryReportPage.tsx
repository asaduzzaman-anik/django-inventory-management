import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Badge } from "../../components/ui/Badge.tsx"
import { FilterDropdown } from "../../components/ui/FilterDropdown.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Table } from "../../components/ui/Table.tsx"
import type { Category } from "../catalog/types.ts"
import { STOCK_STATUSES, stockStatusLabel } from "../inventory/types.ts"
import type { Warehouse } from "../warehouses/types.ts"
import { ReportFrame } from "./ReportFrame.tsx"

type InventoryRow = {
  sku: string
  product_name: string
  warehouse_code: string
  on_hand: string
  reserved: string
  available: string
  status: string
  cost_price: string
  value: string
}

export function InventoryReportPage() {
  const [warehouse, setWarehouse] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const params = { warehouse: warehouse || undefined, category: category || undefined, status: status || undefined }
  const warehouses = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { page_size: 100, ordering: "name" }),
  })
  const categories = useQuery({
    queryKey: ["categories", "options"],
    queryFn: () => fetchPage<Category>("/categories/", { page_size: 100, ordering: "name" }),
  })
  const query = useQuery({
    queryKey: ["reports", "inventory", warehouse, category, status, page],
    queryFn: () => fetchPage<InventoryRow>("/reports/inventory/", { ...params, page }),
    placeholderData: keepPreviousData,
  })

  return (
    <ReportFrame title="Inventory report" exportName="inventory" params={params} filters={
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <FilterDropdown
          label="Warehouse"
          value={warehouse}
          onChange={(value) => { setWarehouse(value); setPage(1) }}
          options={(warehouses.data?.results ?? []).map((row) => ({ value: String(row.id), label: `${row.code} ${row.name}` }))}
        />
        <FilterDropdown
          label="Category"
          value={category}
          onChange={(value) => { setCategory(value); setPage(1) }}
          options={(categories.data?.results ?? []).map((row) => ({ value: String(row.id), label: row.name }))}
        />
        <FilterDropdown
          label="Status"
          value={status}
          onChange={(value) => { setStatus(value); setPage(1) }}
          options={STOCK_STATUSES.map(([value, label]) => ({ value, label }))}
        />
      </div>
    }>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        onRetry={() => query.refetch()}
        isEmpty={(query.data?.results.length ?? 0) === 0}
        emptyTitle="No stock rows"
        emptyMessage="Nothing matches the current filters."
      >
        <Table
          rows={query.data?.results ?? []}
          rowKey={(row) => `${row.warehouse_code}-${row.sku}`}
          columns={[
            { key: "sku", header: "SKU", render: (row) => row.sku },
            { key: "product", header: "Product", render: (row) => row.product_name },
            { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse_code },
            { key: "on_hand", header: "On hand", render: (row) => row.on_hand },
            { key: "reserved", header: "Reserved", render: (row) => row.reserved },
            { key: "available", header: "Available", render: (row) => row.available },
            { key: "status", header: "Status", render: (row) => <Badge>{stockStatusLabel(row.status)}</Badge> },
            { key: "value", header: "Value", render: (row) => row.value },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </ReportFrame>
  )
}

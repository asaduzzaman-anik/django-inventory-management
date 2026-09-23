import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"

import { fetchPage } from "../../api/paging.ts"
import { QueryState } from "../../components/QueryState.tsx"
import { Pagination } from "../../components/ui/Pagination.tsx"
import { Select } from "../../components/ui/Select.tsx"
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
      <>
        <FilterSelect label="Warehouse" value={warehouse} onChange={(value) => { setWarehouse(value); setPage(1) }}>
          <option value="">All</option>
          {(warehouses.data?.results ?? []).map((row) => (
            <option key={row.id} value={row.id}>{row.code} {row.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Category" value={category} onChange={(value) => { setCategory(value); setPage(1) }}>
          <option value="">All</option>
          {(categories.data?.results ?? []).map((row) => (
            <option key={row.id} value={row.id}>{row.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Status" value={status} onChange={(value) => { setStatus(value); setPage(1) }}>
          <option value="">All</option>
          {STOCK_STATUSES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FilterSelect>
      </>
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
            { key: "status", header: "Status", render: (row) => stockStatusLabel(row.status) },
            { key: "value", header: "Value", render: (row) => row.value },
          ]}
        />
        <Pagination page={page} count={query.data?.count ?? 0} onPage={setPage} />
      </QueryState>
    </ReportFrame>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="w-52">
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </div>
  )
}

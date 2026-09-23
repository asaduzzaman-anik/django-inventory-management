import { EmptyState } from "../../components/ui/EmptyState.tsx"
import { Table } from "../../components/ui/Table.tsx"
import type { StockRow } from "./types.ts"

export function StockTable({ rows, showProduct }: { rows: StockRow[]; showProduct: boolean }) {
  if (!rows.length) {
    return <EmptyState title="No stock" message="Nothing is stored here yet." />
  }
  return (
    <Table
      rows={rows}
      rowKey={(row) => row.id}
      columns={[
        ...(showProduct
          ? [
              { key: "sku", header: "SKU", render: (row: StockRow) => row.sku },
              { key: "product", header: "Product", render: (row: StockRow) => row.product_name },
            ]
          : [{ key: "warehouse", header: "Warehouse", render: (row: StockRow) => `${row.warehouse_code} ${row.warehouse_name}` }]),
        { key: "on_hand", header: "On hand", render: (row) => row.on_hand },
        { key: "reserved", header: "Reserved", render: (row) => row.reserved },
        { key: "available", header: "Available", render: (row) => row.available },
        { key: "status", header: "Status", render: (row) => row.status },
      ]}
    />
  )
}

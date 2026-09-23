import type { ReactNode } from "react"

export type Column<T> = {
  key: string
  header: string
  sortKey?: string
  render: (row: T) => ReactNode
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  ordering,
  onSort,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  ordering?: string
  onSort?: (key: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                {column.sortKey && onSort ? (
                  <button type="button" className="hover:text-stone-900" onClick={() => onSort(column.sortKey!)}>
                    {column.header}
                    {ordering === column.sortKey ? " ↑" : ordering === `-${column.sortKey}` ? " ↓" : ""}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-stone-100 last:border-0">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-2 text-stone-800">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

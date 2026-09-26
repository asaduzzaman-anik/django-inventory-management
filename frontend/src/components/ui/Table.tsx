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
    <div className="table-responsive">
      <table className="table">
        <thead className="table-thead">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="table-thead-th">
                {column.sortKey && onSort ? (
                  <button type="button" className="inline-flex items-center gap-1 hover:text-gray-900" onClick={() => onSort(column.sortKey!)}>
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
            <tr key={rowKey(row)} className="table-tr">
              {columns.map((column) => (
                <td key={column.key} className="table-td">
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

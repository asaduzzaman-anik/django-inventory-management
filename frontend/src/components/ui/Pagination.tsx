import { Button } from "./Button.tsx"

const PAGE_SIZE = 20

export function Pagination({
  page,
  count,
  onPage,
}: {
  page: number
  count: number
  onPage: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600">
      <span>
        {count} {count === 1 ? "record" : "records"}
      </span>
      <div className="flex items-center gap-2">
        <Button className="btn-sm" variant="ghost" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button className="btn-sm" variant="ghost" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}

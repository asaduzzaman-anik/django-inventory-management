import type { ReactNode } from "react"

import { Button } from "./ui/Button.tsx"
import { EmptyState } from "./ui/EmptyState.tsx"
import { Spinner } from "./ui/Spinner.tsx"

export function QueryState({
  isPending,
  isError,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyMessage,
  children,
}: {
  isPending: boolean
  isError: boolean
  onRetry: () => void
  isEmpty: boolean
  emptyTitle: string
  emptyMessage: string
  children: ReactNode
}) {
  if (isPending) {
    return <Spinner />
  }
  if (isError) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
        <p>Could not load this list.</p>
        <Button className="mt-3" type="button" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }
  if (isEmpty) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }
  return children
}

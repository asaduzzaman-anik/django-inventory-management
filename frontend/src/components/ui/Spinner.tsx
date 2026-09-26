export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="p-8 text-sm text-gray-500" role="status">
      {label}
    </p>
  )
}

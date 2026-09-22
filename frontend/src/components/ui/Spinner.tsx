export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <p className="p-8 text-sm text-stone-600" role="status">
      {label}
    </p>
  )
}

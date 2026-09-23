export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-md border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
      <h2 className="text-base font-medium text-stone-900">{title}</h2>
      <p className="mt-1 text-sm text-stone-600">{message}</p>
    </div>
  )
}

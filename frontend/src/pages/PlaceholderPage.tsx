export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
      <p className="mt-2 text-sm text-stone-600">This section is not built yet.</p>
    </section>
  )
}

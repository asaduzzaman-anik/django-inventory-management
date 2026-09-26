export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="page-title">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">This section is not built yet.</p>
    </section>
  )
}

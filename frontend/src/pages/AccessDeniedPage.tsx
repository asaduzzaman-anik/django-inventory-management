import { Link } from "react-router-dom"

export function AccessDeniedPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-stone-900">Access denied</h1>
      <p className="mt-2 text-sm text-stone-600">You do not have permission to view this page.</p>
      <Link className="mt-4 inline-block text-sm text-teal-800 underline" to="/">
        Back to the dashboard
      </Link>
    </section>
  )
}

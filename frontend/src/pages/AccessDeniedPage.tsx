import { Link } from "react-router-dom"

export function AccessDeniedPage() {
  return (
    <section className="card card-body max-w-lg">
      <h1 className="page-title">Access denied</h1>
      <p className="page-description text-sm">You do not have permission to view this page.</p>
      <Link className="mt-4 inline-block text-sm link" to="/">
        Back to the dashboard
      </Link>
    </section>
  )
}

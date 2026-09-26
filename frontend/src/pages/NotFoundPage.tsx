import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-body px-4 text-center">
      <div className="card card-body max-w-md">
        <h1 className="page-title">Page not found</h1>
        <p className="page-description text-sm">That address is not part of this application.</p>
        <Link className="mt-4 inline-block text-sm link" to="/">
          Go to the dashboard
        </Link>
      </div>
    </div>
  )
}

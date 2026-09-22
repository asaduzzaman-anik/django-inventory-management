import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Page not found</h1>
      <p className="mt-2 text-sm text-stone-600">That address is not part of this application.</p>
      <Link className="mt-4 text-sm text-teal-800 underline" to="/">
        Go to the dashboard
      </Link>
    </div>
  )
}

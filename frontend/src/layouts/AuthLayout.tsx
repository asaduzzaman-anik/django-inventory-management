import type { ReactNode } from "react"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-8 shadow-sm">{children}</div>
    </div>
  )
}

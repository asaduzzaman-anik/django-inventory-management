import type { ReactNode } from "react"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-10">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
      <div className="relative hidden w-1/2 items-center justify-center bg-brand-950 lg:flex">
        <div className="max-w-xs text-center">
          <p className="text-3xl font-bold text-white">Inventory</p>
          <p className="mt-3 text-gray-400">Inventory and warehouse management</p>
        </div>
      </div>
    </div>
  )
}

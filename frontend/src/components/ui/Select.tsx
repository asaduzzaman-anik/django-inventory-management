import type { SelectHTMLAttributes } from "react"

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
}

export function Select({ label, error, id, name, children, ...props }: SelectProps) {
  const inputId = id ?? name
  return (
    <label className="block text-sm" htmlFor={inputId}>
      <span className="font-medium text-stone-700">{label}</span>
      <select
        id={inputId}
        name={name}
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-800"
        {...props}
      >
        {children}
      </select>
      {error ? <span className="mt-1 block text-red-700">{error}</span> : null}
    </label>
  )
}

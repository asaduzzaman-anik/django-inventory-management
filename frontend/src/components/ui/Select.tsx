import type { SelectHTMLAttributes } from "react"

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
}

export function Select({ label, error, id, name, className = "", children, ...props }: SelectProps) {
  const inputId = id ?? name
  return (
    <label className="block" htmlFor={inputId}>
      <span className="form-label">{label}</span>
      <select id={inputId} name={name} className={`form-control ${className}`} {...props}>
        {children}
      </select>
      {error ? <span className="mt-1.5 block text-sm text-error-600">{error}</span> : null}
    </label>
  )
}

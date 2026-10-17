import type { InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, name, className = "", ...props }: InputProps) {
  const inputId = id ?? name
  return (
    <label className="block" htmlFor={inputId}>
      <span className="form-label">{label}</span>
      <input id={inputId} name={name} className={`form-control ${className}`} {...props} />
      {hint && !error ? <span className="mt-1.5 block text-sm text-gray-500">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-sm text-error-600">{error}</span> : null}
    </label>
  )
}

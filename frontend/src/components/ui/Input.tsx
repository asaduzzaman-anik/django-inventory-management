import type { InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function Input({ label, error, id, name, className = "", ...props }: InputProps) {
  const inputId = id ?? name
  return (
    <label className="block" htmlFor={inputId}>
      <span className="form-label">{label}</span>
      <input id={inputId} name={name} className={`form-control ${className}`} {...props} />
      {error ? <span className="mt-1.5 block text-sm text-error-600">{error}</span> : null}
    </label>
  )
}

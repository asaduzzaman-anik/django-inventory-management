import type { TextareaHTMLAttributes } from "react"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

export function Textarea({ label, error, id, name, className = "", ...props }: TextareaProps) {
  const inputId = id ?? name
  return (
    <label className="block" htmlFor={inputId}>
      <span className="form-label">{label}</span>
      <textarea id={inputId} name={name} className={`form-control-textarea ${className}`} {...props} />
      {error ? <span className="mt-1.5 block text-sm text-error-600">{error}</span> : null}
    </label>
  )
}

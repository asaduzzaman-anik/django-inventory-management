import type { InputHTMLAttributes } from "react"

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Checkbox({ label, id, name, className = "", ...props }: CheckboxProps) {
  const inputId = id ?? name
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700" htmlFor={inputId}>
      <input id={inputId} name={name} type="checkbox" className={`form-checkbox ${className}`} {...props} />
      {label}
    </label>
  )
}

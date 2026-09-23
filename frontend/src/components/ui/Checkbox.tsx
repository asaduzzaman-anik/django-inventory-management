import type { InputHTMLAttributes } from "react"

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Checkbox({ label, id, name, ...props }: CheckboxProps) {
  const inputId = id ?? name
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700" htmlFor={inputId}>
      <input id={inputId} name={name} type="checkbox" className="size-4" {...props} />
      {label}
    </label>
  )
}

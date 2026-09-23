import type { TextareaHTMLAttributes } from "react"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  error?: string
}

export function Textarea({ label, error, id, name, ...props }: TextareaProps) {
  const inputId = id ?? name
  return (
    <label className="block text-sm" htmlFor={inputId}>
      <span className="font-medium text-stone-700">{label}</span>
      <textarea
        id={inputId}
        name={name}
        className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-teal-800"
        {...props}
      />
      {error ? <span className="mt-1 block text-red-700">{error}</span> : null}
    </label>
  )
}

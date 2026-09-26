import { useEffect, useId, useRef, useState } from "react"
import { LuChevronDown } from "react-icons/lu"

export type FilterOption = {
  value: string
  label: string
}

export function FilterDropdown({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = value !== ""
  const items = [{ value: "", label: allLabel }, ...options]

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  return (
    <div className="relative flex items-center" ref={rootRef}>
      <button
        type="button"
        className={`btn-default gap-2 whitespace-nowrap ${selected ? "bg-primary/5 ring-2 ring-primary/50" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        {selected ? <span className="inline-flex size-2 rounded-full bg-primary" aria-hidden="true" /> : null}
        <LuChevronDown aria-hidden="true" size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute top-10 right-0 z-20 mt-2 max-h-80 w-56 overflow-y-auto rounded-md bg-white p-3 shadow">
          <ul id={listId} role="listbox" aria-label={label} className="space-y-2">
            {items.map((option) => {
              const active = option.value === value
              return (
                <li key={option.value || "all"}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`w-full cursor-pointer rounded px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-200 ${active ? "bg-gray-200 font-bold" : ""}`}
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

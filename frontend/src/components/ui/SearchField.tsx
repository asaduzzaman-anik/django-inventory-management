import { useEffect, useRef, useState } from "react"
import { LuSearch, LuX } from "react-icons/lu"

type SearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchField({ value, onChange, placeholder = "Search...", className = "" }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isMac] = useState(() => /Mac|iPhone|iPad/.test(navigator.platform))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className={`relative flex w-full items-center md:w-80 ${className}`}>
      <span className="pointer-events-none absolute left-4 flex text-gray-500">
        <LuSearch aria-hidden="true" size={20} />
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="form-control !pl-12 !pr-14"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <LuX aria-hidden="true" size={18} />
        </button>
      ) : (
        <span className="pointer-events-none absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-[4.5px] text-xs tracking-tight text-gray-500">
          {isMac ? "⌘" : "Ctrl"}
          <span>K</span>
        </span>
      )}
    </div>
  )
}

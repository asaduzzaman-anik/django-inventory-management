import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import type { ComponentProps, KeyboardEvent as ReactKeyboardEvent, ReactNode, Ref } from "react"
import { LuCheck, LuChevronDown, LuSearch } from "react-icons/lu"

type SelectProps = ComponentProps<"select"> & {
  label: string
  error?: string
  searchable?: boolean
  searchPlaceholder?: string
}

type SelectOption = {
  value: string
  label: string
  disabled: boolean
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join("")
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ""
}

function readOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<ComponentProps<"option">>(child) || child.type !== "option") return []
    const label = textOf(child.props.children)
    return [{ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) }]
  })
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}

export function Select({
  label,
  error,
  searchable = false,
  searchPlaceholder = "Search",
  id,
  name,
  className = "",
  children,
  ref,
  value,
  disabled,
  ...props
}: SelectProps) {
  const fallbackId = useId()
  const inputId = id ?? name ?? fallbackId
  const labelId = `${inputId}-label`
  const listId = `${inputId}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [domValue, setDomValue] = useState("")
  const [query, setQuery] = useState("")

  const options = readOptions(children)
  const currentValue = value !== undefined ? String(value) : domValue
  const selectedIndex = options.findIndex((option) => option.value === currentValue)
  const selected = options[selectedIndex] ?? options[0]
  const needle = query.trim().toLowerCase()
  const visible = needle ? options.filter((option) => option.value !== "" && option.label.toLowerCase().includes(needle)) : options

  // Uncontrolled selects (react-hook-form register) get their value set on the DOM node, so mirror it.
  useLayoutEffect(() => {
    const element = selectRef.current
    if (value === undefined && element && element.value !== domValue) setDomValue(element.value)
  })

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
  }, [open, searchable])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.children[activeIndex]?.scrollIntoView?.({ block: "nearest" })
  }, [open, activeIndex])

  function openList() {
    setQuery("")
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }

  function closeList() {
    setOpen(false)
    buttonRef.current?.focus()
  }

  function choose(option: SelectOption) {
    const element = selectRef.current
    closeList()
    if (!element || option.disabled || option.value === currentValue) return
    element.value = option.value
    element.dispatchEvent(new Event("change", { bubbles: true }))
  }

  function move(step: number) {
    if (visible.length === 0) return
    let next = activeIndex
    for (let i = 0; i < visible.length; i += 1) {
      next = (next + step + visible.length) % visible.length
      if (!visible[next].disabled) break
    }
    setActiveIndex(next)
  }

  function onListKeyDown(event: ReactKeyboardEvent<HTMLElement>, fromSearch: boolean) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      move(event.key === "ArrowDown" ? 1 : -1)
    } else if (!fromSearch && (event.key === "Home" || event.key === "End")) {
      event.preventDefault()
      setActiveIndex(event.key === "Home" ? 0 : visible.length - 1)
    } else if (event.key === "Enter" || (!fromSearch && event.key === " ")) {
      event.preventDefault()
      if (visible[activeIndex]) choose(visible[activeIndex])
    } else if (event.key === "Escape") {
      event.preventDefault()
      closeList()
    } else if (event.key === "Tab") {
      setOpen(false)
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (open) {
      onListKeyDown(event, false)
    } else if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault()
      openList()
    }
  }

  return (
    <div className="block">
      <label id={labelId} className="form-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="relative" ref={rootRef}>
        <select
          id={inputId}
          name={name}
          ref={(element) => {
            selectRef.current = element
            assignRef(ref, element)
          }}
          value={value}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onFocus={() => buttonRef.current?.focus()}
          {...props}
        >
          {children}
        </select>
        <button
          ref={buttonRef}
          type="button"
          role="combobox"
          className={`form-control flex items-center justify-between gap-2 text-left ${error ? "ring-error-500" : ""} ${open ? "ring-2 ring-primary" : ""} ${className}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={onKeyDown}
        >
          <span className={`truncate ${selected && selected.value !== "" ? "" : "text-gray-400"}`}>{selected?.label ?? ""}</span>
          <LuChevronDown
            aria-hidden="true"
            size={18}
            className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open ? (
          <div className="absolute right-0 left-0 z-20 mt-2 rounded-md bg-white p-2 shadow-theme-lg ring-1 ring-gray-100">
            {searchable ? (
              <div className="relative mb-2">
                <LuSearch aria-hidden="true" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  role="searchbox"
                  className="form-control pl-9"
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${label}`}
                  aria-controls={listId}
                  aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                  autoComplete="off"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActiveIndex(0)
                  }}
                  onKeyDown={(event) => onListKeyDown(event, true)}
                />
              </div>
            ) : null}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={labelId}
              className="max-h-64 space-y-1 overflow-y-auto"
            >
              {visible.length === 0 ? <li className="px-3 py-2 text-sm text-gray-500">No matches</li> : null}
              {visible.map((option, index) => {
                const isSelected = option.value === currentValue
                return (
                  <li
                    key={`${option.value}-${index}`}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded px-3 py-2 text-sm text-gray-700 ${
                      index === activeIndex ? "bg-gray-100" : ""
                    } ${isSelected ? "bg-primary/5 font-semibold text-primary" : ""} ${
                      option.disabled ? "cursor-not-allowed opacity-50" : "hover:bg-gray-100"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <LuCheck aria-hidden="true" size={16} className="shrink-0" /> : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
      {error ? <span className="mt-1.5 block text-sm text-error-600">{error}</span> : null}
    </div>
  )
}

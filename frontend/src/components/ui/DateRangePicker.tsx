import { useEffect, useId, useRef, useState } from "react"
import { LuChevronDown, LuChevronLeft, LuChevronRight } from "react-icons/lu"

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const PRESETS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["last_week", "Last week"],
  ["last_month", "Last month"],
  ["last_quarter", "Last quarter"],
] as const

export type DatePreset = (typeof PRESETS)[number][0]

export function toISODate(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${value.getFullYear()}-${month}-${day}`
}

export function parseISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function presetRange(preset: DatePreset, today: Date) {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (preset === "today") {
    const iso = toISODate(day)
    return { start: iso, end: iso }
  }
  if (preset === "yesterday") {
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1)
    const iso = toISODate(date)
    return { start: iso, end: iso }
  }
  if (preset === "last_week") {
    const mondayOffset = (day.getDay() + 6) % 7
    const thisMonday = new Date(day.getFullYear(), day.getMonth(), day.getDate() - mondayOffset)
    const start = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 7)
    const end = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() - 1)
    return { start: toISODate(start), end: toISODate(end) }
  }
  if (preset === "last_month") {
    const start = new Date(day.getFullYear(), day.getMonth() - 1, 1)
    const end = new Date(day.getFullYear(), day.getMonth(), 0)
    return { start: toISODate(start), end: toISODate(end) }
  }
  const quarterStartMonth = Math.floor(day.getMonth() / 3) * 3
  const start = new Date(day.getFullYear(), quarterStartMonth - 3, 1)
  const end = new Date(day.getFullYear(), quarterStartMonth, 0)
  return { start: toISODate(start), end: toISODate(end) }
}

function formatShort(value: string) {
  const date = parseISODate(value)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`
}

function ordered(start: string, end: string) {
  if (!start || !end) return { from: start, to: end }
  return start <= end ? { from: start, to: end } : { from: end, to: start }
}

function monthCells(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - offset)
  return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index))
}

export function DateRangePicker({
  start,
  end,
  onChange,
}: {
  start: string
  end: string
  onChange: (start: string, end: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => parseISODate(start || end || toISODate(new Date())))
  const [draftStart, setDraftStart] = useState("")
  const [hover, setHover] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const label = start && end ? `${formatShort(start)} – ${formatShort(end)}` : "Date range"
  const preview = ordered(draftStart, hover || draftStart)
  const selected = ordered(start, end)
  const from = draftStart ? preview.from : selected.from
  const to = draftStart ? preview.to : selected.to

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

  function apply(nextStart: string, nextEnd: string) {
    onChange(nextStart, nextEnd)
    setDraftStart("")
    setHover("")
    setOpen(false)
  }

  function pick(iso: string) {
    if (!draftStart) {
      setDraftStart(iso)
      setHover(iso)
      return
    }
    const range = ordered(draftStart, iso)
    apply(range.from, range.to)
  }

  function choosePreset(preset: DatePreset) {
    const range = presetRange(preset, new Date())
    setCursor(parseISODate(range.start))
    apply(range.start, range.end)
  }

  const cells = monthCells(cursor)

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`inline-flex h-10 items-center gap-3 rounded-lg border bg-white px-4 text-sm whitespace-nowrap ${open ? "border-primary" : "border-gray-200"} ${start && end ? "text-gray-800" : "text-gray-400"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((current) => !current)
          setDraftStart("")
          setHover("")
          if (end) setCursor(parseISODate(end))
          else if (start) setCursor(parseISODate(start))
        }}
      >
        {label}
        <LuChevronDown aria-hidden="true" size={16} className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div id={panelId} role="dialog" aria-label="Date range" className="absolute top-12 right-0 z-30 flex w-[34rem] max-w-[calc(100vw-2rem)] rounded-xl bg-white p-4 shadow-lg">
          <div className="flex w-36 shrink-0 flex-col pr-3">
            {PRESETS.map(([preset, name]) => (
              <button
                key={preset}
                type="button"
                className="rounded px-2 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                onClick={() => choosePreset(preset)}
              >
                {name}
              </button>
            ))}
            <button type="button" className="mt-auto px-2 py-2 text-left text-sm font-medium text-primary" onClick={() => apply("", "")}>
              Reset
            </button>
          </div>
          <div className="min-w-0 flex-1 pl-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                  aria-label="Previous month"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                >
                  <LuChevronLeft aria-hidden="true" size={18} />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                  aria-label="Next month"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  <LuChevronRight aria-hidden="true" size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-400">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-1">{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date) => {
                const iso = toISODate(date)
                const outside = date.getMonth() !== cursor.getMonth()
                const isStart = Boolean(from && to && iso === from && from !== to)
                const isEnd = Boolean(from && to && iso === to && from !== to)
                const isMid = Boolean(from && to && iso > from && iso < to)
                const isSingle = Boolean(from && to && from === to && iso === from)
                return (
                  <button
                    key={iso}
                    type="button"
                    className="relative flex h-10 items-center justify-center"
                    onMouseEnter={() => draftStart && setHover(iso)}
                    onClick={() => pick(iso)}
                  >
                    {isMid ? <span className="absolute inset-y-1 inset-x-0 bg-brand-100" /> : null}
                    {isStart ? <span className="absolute inset-y-1 right-0 left-1/2 bg-brand-100" /> : null}
                    {isEnd ? <span className="absolute inset-y-1 right-1/2 left-0 bg-brand-100" /> : null}
                    <span
                      className={`relative z-10 flex size-8 items-center justify-center rounded-full text-sm ${
                        isStart || isEnd || isSingle
                          ? "bg-primary font-medium text-white"
                          : outside
                            ? "text-gray-300"
                            : "text-gray-800"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { formatWhen } from "../inventory/types.ts"

type Notification = {
  id: number
  title: string
  body: string
  entity_type: string
  entity_id: string
  read_at: string | null
  created_at: string
}

function notificationPath(note: Notification) {
  if (note.entity_type === "purchasing.PurchaseOrder" && note.entity_id) {
    return `/purchasing/${note.entity_id}`
  }
  if (note.entity_type === "inventory.StockTransfer" && note.entity_id) {
    return `/inventory/transfers/${note.entity_id}`
  }
  if (note.entity_type === "inventory.StockAdjustment" && note.entity_id) {
    return `/inventory/adjustments/${note.entity_id}`
  }
  if (note.entity_type === "inventory.StockLevel") {
    return "/inventory"
  }
  return null
}

export function NotificationMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const notes = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchPage<Notification>("/notifications/", { page_size: 20 }),
  })
  const unread = (notes.data?.results ?? []).filter((note) => !note.read_at).length

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  async function openNote(note: Notification) {
    if (!note.read_at) {
      await api.post(`/notifications/${note.id}/read/`)
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }
    const path = notificationPath(note)
    setOpen(false)
    if (path) {
      navigate(path)
    }
  }

  async function markAll() {
    await api.post("/notifications/read-all/")
    await queryClient.invalidateQueries({ queryKey: ["notifications"] })
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100"
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        onClick={() => setOpen((current) => !current)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path strokeLinecap="round" d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        {unread ? <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error-500" /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-99 mt-3 w-80 rounded-md border border-gray-200 bg-white p-3 shadow-theme-lg">
          <div className="mb-2 flex items-center justify-between border-b border-gray-200 px-2 pb-2">
            <span className="text-sm font-medium text-gray-700">Notifications</span>
            <button className="text-xs text-primary" type="button" onClick={markAll}>
              Mark all read
            </button>
          </div>
          {notes.isPending ? <p className="px-2 py-3 text-sm text-gray-500">Loading…</p> : null}
          {notes.isError ? <p className="px-2 py-3 text-sm text-error-700">Could not load notifications.</p> : null}
          {notes.data && !notes.data.results.length ? <p className="px-2 py-3 text-sm text-gray-500">No notifications.</p> : null}
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {(notes.data?.results ?? []).map((note) => (
              <li key={note.id}>
                <button
                  className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-gray-100 ${note.read_at ? "text-gray-500" : "text-gray-800"}`}
                  type="button"
                  onClick={() => openNote(note)}
                >
                  <span className="block font-medium">{note.title}</span>
                  <span className="block text-xs text-gray-500">{formatWhen(note.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

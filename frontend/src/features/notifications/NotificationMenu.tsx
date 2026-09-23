import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
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
  const notes = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchPage<Notification>("/notifications/", { page_size: 20 }),
  })
  const unread = (notes.data?.results ?? []).filter((note) => !note.read_at).length

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
    <div className="relative">
      <button className="text-sm text-teal-800" type="button" onClick={() => setOpen((current) => !current)}>
        Notifications{unread ? ` (${unread})` : ""}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-stone-200 bg-white p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-sm font-medium text-stone-800">Notifications</span>
            <button className="text-xs text-teal-800" type="button" onClick={markAll}>
              Mark all read
            </button>
          </div>
          {notes.isPending ? <p className="px-2 py-3 text-sm text-stone-500">Loading…</p> : null}
          {notes.isError ? <p className="px-2 py-3 text-sm text-red-800">Could not load notifications.</p> : null}
          {notes.data && !notes.data.results.length ? <p className="px-2 py-3 text-sm text-stone-500">No notifications.</p> : null}
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {(notes.data?.results ?? []).map((note) => (
              <li key={note.id}>
                <button
                  className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-stone-50 ${note.read_at ? "text-stone-600" : "text-stone-900"}`}
                  type="button"
                  onClick={() => openNote(note)}
                >
                  <span className="block font-medium">{note.title}</span>
                  <span className="block text-xs text-stone-500">{formatWhen(note.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

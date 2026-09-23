import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { fetchPage } from "../../api/paging.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { documentError } from "../../utils/apiError.ts"
import { useAuth } from "../auth/AuthContext.tsx"
import type { Warehouse } from "../warehouses/types.ts"
import { AdminNav } from "./adminNav.tsx"
import { ROLES, type AdminUser } from "./types.ts"

export function UserDetailPage() {
  const { id } = useParams()
  const userId = Number(id)
  const queryClient = useQueryClient()
  const { user: current } = useAuth()
  const [role, setRole] = useState("")
  const [warehouseIds, setWarehouseIds] = useState<number[] | null>(null)
  const [banner, setBanner] = useState("")
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const user = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => (await api.get<AdminUser>(`/users/${userId}/`)).data,
  })
  const assignments = useQuery({
    queryKey: ["user-warehouses", userId],
    queryFn: async () => (await api.get<{ warehouses: { id: number; code: string; name: string }[] }>(`/users/${userId}/warehouses/`)).data,
  })
  const warehouses = useQuery({
    queryKey: ["warehouses", "options"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { page_size: 100, ordering: "name" }),
  })

  const selectedRole = role || user.data?.role || ""
  const selectedWarehouses = warehouseIds ?? (assignments.data?.warehouses.map((row) => row.id) ?? [])

  async function saveRole() {
    setPending(true)
    setBanner("")
    try {
      await api.put(`/users/${userId}/role/`, { role: selectedRole })
      await queryClient.invalidateQueries({ queryKey: ["user", userId] })
      await queryClient.invalidateQueries({ queryKey: ["users"] })
      toast("Role updated.")
    } catch (error) {
      setBanner(documentError(error))
    } finally {
      setPending(false)
    }
  }

  async function saveWarehouses() {
    setPending(true)
    setBanner("")
    try {
      await api.put(`/users/${userId}/warehouses/`, { warehouses: selectedWarehouses })
      await queryClient.invalidateQueries({ queryKey: ["user-warehouses", userId] })
      setWarehouseIds(null)
      toast("Warehouses updated.")
    } catch (error) {
      setBanner(documentError(error))
    } finally {
      setPending(false)
    }
  }

  async function setActive(isActive: boolean) {
    setPending(true)
    setBanner("")
    try {
      await api.patch(`/users/${userId}/`, { is_active: isActive })
      await queryClient.invalidateQueries({ queryKey: ["user", userId] })
      await queryClient.invalidateQueries({ queryKey: ["users"] })
      toast(isActive ? "User reactivated." : "User deactivated.")
      setConfirm(false)
    } catch (error) {
      setBanner(documentError(error))
      setConfirm(false)
    } finally {
      setPending(false)
    }
  }

  if (user.isPending || assignments.isPending || warehouses.isPending) {
    return <Spinner />
  }
  if (user.isError || !user.data) {
    return <p className="text-sm text-red-800">Could not load this user.</p>
  }

  const item = user.data
  const self = current?.id === item.id

  return (
    <section className="max-w-xl space-y-6">
      <Link className="text-sm text-teal-800 underline" to="/admin/users">
        Users
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">{item.username}</h1>
        <p className="text-sm text-stone-600">{item.is_active ? "Active" : "Inactive"} · {item.email}</p>
      </div>
      <AdminNav />
      {banner ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{banner}</p> : null}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Select label="Role" value={selectedRole} onChange={(event) => setRole(event.target.value)}>
            {ROLES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </Select>
        </div>
        <Button type="button" disabled={pending || selectedRole === item.role} onClick={saveRole}>
          Save role
        </Button>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-stone-700">Warehouses</legend>
        {(warehouses.data?.results ?? []).map((warehouse) => (
          <label key={warehouse.id} className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              checked={selectedWarehouses.includes(warehouse.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selectedWarehouses, warehouse.id]
                  : selectedWarehouses.filter((value) => value !== warehouse.id)
                setWarehouseIds(next)
              }}
            />
            {warehouse.code} {warehouse.name}
          </label>
        ))}
        <Button type="button" variant="ghost" disabled={pending} onClick={saveWarehouses}>
          Save warehouses
        </Button>
      </fieldset>
      {self ? null : item.is_active ? (
        <Button type="button" variant="danger" onClick={() => setConfirm(true)}>
          Deactivate
        </Button>
      ) : (
        <Button type="button" disabled={pending} onClick={() => setActive(true)}>
          Reactivate
        </Button>
      )}
      {confirm ? (
        <ConfirmDialog
          title="Deactivate user"
          message={`${item.username} will no longer be able to sign in.`}
          confirmLabel="Deactivate"
          pending={pending}
          onConfirm={() => setActive(false)}
          onClose={() => setConfirm(false)}
        />
      ) : null}
    </section>
  )
}

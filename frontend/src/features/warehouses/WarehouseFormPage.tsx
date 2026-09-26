import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { OrganizationForm } from "../OrganizationForm.tsx"
import type { OrganizationValues } from "../organizationSchema.ts"
import type { Warehouse } from "./types.ts"

export function WarehouseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const warehouseId = id ? Number(id) : null
  const warehouse = useQuery({
    queryKey: ["warehouse", warehouseId],
    queryFn: async () => (await api.get<Warehouse>(`/warehouses/${warehouseId}/`)).data,
    enabled: warehouseId !== null,
  })

  async function onSubmit(values: OrganizationValues) {
    const saved = warehouseId
      ? (await api.patch<Warehouse>(`/warehouses/${warehouseId}/`, values)).data
      : (await api.post<Warehouse>("/warehouses/", values)).data
    await queryClient.invalidateQueries({ queryKey: ["warehouses"] })
    await queryClient.invalidateQueries({ queryKey: ["warehouse", saved.id] })
    toast("Warehouse saved.")
    navigate(`/warehouses/${saved.id}`)
  }

  if (warehouseId !== null && warehouse.isPending) {
    return <Spinner />
  }
  if (warehouse.isError) {
    return <p className="text-sm text-error-700">Could not load this warehouse.</p>
  }

  return (
    <section>
      <Link className="text-sm link" to={warehouseId ? `/warehouses/${warehouseId}` : "/warehouses"}>
        Back
      </Link>
      <h1 className="mt-2 mb-4 page-title">
        {warehouseId ? "Edit warehouse" : "New warehouse"}
      </h1>
      <OrganizationForm defaultValues={warehouse.data} submitLabel="Save warehouse" onSubmit={onSubmit} />
    </section>
  )
}

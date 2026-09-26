import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { OrganizationForm } from "../OrganizationForm.tsx"
import type { OrganizationValues } from "../organizationSchema.ts"
import type { Supplier } from "./types.ts"

export function SupplierFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const supplierId = id ? Number(id) : null
  const supplier = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: async () => (await api.get<Supplier>(`/suppliers/${supplierId}/`)).data,
    enabled: supplierId !== null,
  })

  async function onSubmit(values: OrganizationValues) {
    const saved = supplierId
      ? (await api.patch<Supplier>(`/suppliers/${supplierId}/`, values)).data
      : (await api.post<Supplier>("/suppliers/", values)).data
    await queryClient.invalidateQueries({ queryKey: ["suppliers"] })
    await queryClient.invalidateQueries({ queryKey: ["supplier", saved.id] })
    toast("Supplier saved.")
    navigate(`/suppliers/${saved.id}`)
  }

  if (supplierId !== null && supplier.isPending) {
    return <Spinner />
  }
  if (supplier.isError) {
    return <p className="text-sm text-error-700">Could not load this supplier.</p>
  }

  return (
    <section>
      <Link className="text-sm link" to={supplierId ? `/suppliers/${supplierId}` : "/suppliers"}>
        Back
      </Link>
      <h1 className="mt-2 mb-4 page-title">{supplierId ? "Edit supplier" : "New supplier"}</h1>
      <OrganizationForm defaultValues={supplier.data} submitLabel="Save supplier" onSubmit={onSubmit} />
    </section>
  )
}

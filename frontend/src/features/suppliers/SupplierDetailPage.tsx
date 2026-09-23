import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx"
import { Spinner } from "../../components/ui/Spinner.tsx"
import { useCan } from "../auth/useCan.ts"
import type { Supplier } from "./types.ts"

export function SupplierDetailPage() {
  const { id } = useParams()
  const canChange = useCan("suppliers.change_supplier")
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const supplier = useQuery({
    queryKey: ["supplier", Number(id)],
    queryFn: async () => (await api.get<Supplier>(`/suppliers/${id}/`)).data,
  })

  async function deactivate() {
    setPending(true)
    try {
      await api.patch(`/suppliers/${id}/`, { is_active: false })
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      await queryClient.invalidateQueries({ queryKey: ["supplier", Number(id)] })
      toast("Supplier deactivated.")
      setConfirming(false)
    } finally {
      setPending(false)
    }
  }

  if (supplier.isPending) {
    return <Spinner />
  }
  if (supplier.isError || !supplier.data) {
    return <p className="text-sm text-red-800">Could not load this supplier.</p>
  }

  const item = supplier.data
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link className="text-sm text-teal-800 underline" to="/suppliers">
            Suppliers
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900">
            {item.code} {item.name}
          </h1>
          <p className="text-sm text-stone-600">{item.is_active ? "Active" : "Inactive"}</p>
        </div>
        {canChange ? (
          <div className="flex gap-2">
            <Link className="rounded-md bg-white px-4 py-2 text-sm font-medium text-stone-800 ring-1 ring-stone-300" to={`/suppliers/${item.id}/edit`}>
              Edit
            </Link>
            {item.is_active ? (
              <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
                Deactivate
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Field label="Email" value={item.email || "—"} />
        <Field label="Phone" value={item.phone || "—"} />
        <Field label="Contact" value={item.contact_name || "—"} />
        <Field label="City" value={item.city || "—"} />
        <Field label="Country" value={item.country || "—"} />
        <Field label="Address" value={item.address_line || "—"} />
      </dl>
      {confirming ? (
        <ConfirmDialog
          title="Deactivate supplier"
          message={`${item.code} will leave the active supplier list.`}
          confirmLabel="Deactivate"
          pending={pending}
          onConfirm={deactivate}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-stone-500">{label}</dt>
      <dd className="text-stone-900">{value}</dd>
    </div>
  )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "../components/ui/Button.tsx"
import { Checkbox } from "../components/ui/Checkbox.tsx"
import { Input } from "../components/ui/Input.tsx"
import { applyFieldErrors, formBanner } from "../utils/apiError.ts"
import { emptyOrganization, organizationSchema, type OrganizationValues } from "./organizationSchema.ts"

export function OrganizationForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: OrganizationValues
  submitLabel: string
  onSubmit: (values: OrganizationValues) => Promise<void>
}) {
  const [banner, setBanner] = useState("")
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: defaultValues ?? emptyOrganization,
  })

  return (
    <form
      className="card card-body max-w-3xl space-y-5"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setBanner("")
        try {
          await onSubmit(values)
        } catch (error) {
          applyFieldErrors(error, setError)
          setBanner(formBanner(error))
        }
      })}
    >
      {banner ? <p className="alert alert-danger text-sm">{banner}</p> : null}
      <Input label="Name" error={errors.name?.message} {...register("name")} />
      <Input label="Code" error={errors.code?.message} {...register("code")} />
      <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
      <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
      <Input label="Contact name" error={errors.contact_name?.message} {...register("contact_name")} />
      <Input label="Address" error={errors.address_line?.message} {...register("address_line")} />
      <Input label="City" error={errors.city?.message} {...register("city")} />
      <Input label="Country" error={errors.country?.message} {...register("country")} />
      <Checkbox label="Active" {...register("is_active")} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  )
}

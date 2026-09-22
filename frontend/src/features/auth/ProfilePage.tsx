import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"

import { updateProfile } from "../../api/auth.ts"
import { toast } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { applyFieldErrors } from "../../utils/apiError.ts"
import { useAuth } from "./AuthContext.tsx"
import { profileSchema, type ProfileValues } from "./schemas.ts"

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email ?? "",
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      phone: user?.phone ?? "",
    },
  })

  async function onSubmit(values: ProfileValues) {
    try {
      setUser(await updateProfile(values))
      toast("Profile saved.")
    } catch (error) {
      applyFieldErrors(error, setError)
    }
  }

  return (
    <section className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Profile</h1>
        <p className="mt-1 text-sm text-stone-600">
          {user?.username}
          {user?.role ? ` · ${user.role}` : ""}
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
        <Input label="First name" autoComplete="given-name" error={errors.first_name?.message} {...register("first_name")} />
        <Input label="Last name" autoComplete="family-name" error={errors.last_name?.message} {...register("last_name")} />
        <Input label="Phone" autoComplete="tel" error={errors.phone?.message} {...register("phone")} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save profile"}
        </Button>
      </form>
      <Link className="inline-block text-sm text-teal-800 underline" to="/change-password">
        Change password
      </Link>
    </section>
  )
}

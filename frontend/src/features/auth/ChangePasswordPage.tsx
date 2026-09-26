import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { changePassword } from "../../api/auth.ts"
import { toast } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { applyFieldErrors } from "../../utils/apiError.ts"
import { passwordSchema, type PasswordValues } from "./schemas.ts"

export function ChangePasswordPage() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "" },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      await changePassword(values.current_password, values.new_password)
      reset()
      toast("Password changed.")
    } catch (error) {
      applyFieldErrors(error, setError)
    }
  }

  return (
    <section className="max-w-lg space-y-4">
      <h1 className="page-title">Change password</h1>
      <form className="card card-body space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register("current_password")}
        />
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.new_password?.message}
          {...register("new_password")}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Update password"}
        </Button>
      </form>
    </section>
  )
}

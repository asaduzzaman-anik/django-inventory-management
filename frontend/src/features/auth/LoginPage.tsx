import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"

import { Button } from "../../components/ui/Button.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { apiDetail } from "../../utils/apiError.ts"
import { useAuth } from "./AuthContext.tsx"
import { loginSchema, type LoginValues } from "./schemas.ts"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    setFormError("")
    try {
      await login(values.username, values.password)
      navigate("/", { replace: true })
    } catch (error) {
      setFormError(apiDetail(error))
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Sign in</h1>
        <p className="mt-1 text-sm text-stone-600">Inventory and warehouse management</p>
      </div>
      {formError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {formError}
        </p>
      ) : null}
      <Input label="Username" autoComplete="username" error={errors.username?.message} {...register("username")} />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}

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
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="mb-2">
        <h1 className="mb-2 text-title-sm font-semibold text-gray-700">Sign in</h1>
        <p className="text-sm text-gray-500">Enter your username and password to sign in.</p>
      </div>
      {formError ? (
        <p className="alert alert-danger text-sm" role="alert">
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
      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  )
}

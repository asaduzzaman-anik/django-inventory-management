import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { api, toast } from "../../api/client.ts"
import { Button } from "../../components/ui/Button.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import { formBanner } from "../../utils/apiError.ts"
import type { ApiErrorBody } from "../../types/api.ts"
import { AdminNav } from "./adminNav.tsx"
import { ROLES, type AdminUser } from "./types.ts"

export function UserFormPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<string>(ROLES[4])
  const [banner, setBanner] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  async function save() {
    setPending(true)
    setBanner("")
    setErrors({})
    try {
      const response = await api.post<AdminUser>("/users/", {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone,
        is_active: true,
        role,
      })
      toast("User created.")
      navigate(`/admin/users/${response.data.id}`)
    } catch (error) {
      setBanner(formBanner(error))
      const fieldErrors = (error as { response?: { data?: ApiErrorBody } }).response?.data?.errors ?? {}
      const next: Record<string, string> = {}
      for (const [key, value] of Object.entries(fieldErrors)) {
        next[key] = Array.isArray(value) ? value.join(" ") : String(value)
      }
      setErrors(next)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="card card-body max-w-3xl space-y-5">
      <Link className="text-sm link" to="/admin/users">
        Users
      </Link>
      <h1 className="page-title">New user</h1>
      <AdminNav />
      {banner ? <p className="alert alert-danger text-sm">{banner}</p> : null}
      <Input label="Username" value={username} error={errors.username} onChange={(event) => setUsername(event.target.value)} />
      <Input label="Email" type="email" value={email} error={errors.email} onChange={(event) => setEmail(event.target.value)} />
      <Input label="Password" type="password" value={password} error={errors.password} onChange={(event) => setPassword(event.target.value)} />
      <Input label="First name" value={firstName} error={errors.first_name} onChange={(event) => setFirstName(event.target.value)} />
      <Input label="Last name" value={lastName} error={errors.last_name} onChange={(event) => setLastName(event.target.value)} />
      <Input label="Phone" value={phone} error={errors.phone} onChange={(event) => setPhone(event.target.value)} />
      <Select label="Role" value={role} onChange={(event) => setRole(event.target.value)}>
        {ROLES.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </Select>
      {errors.role ? <p className="text-sm text-error-600">{errors.role}</p> : null}
      <Button type="button" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Create user"}
      </Button>
    </section>
  )
}

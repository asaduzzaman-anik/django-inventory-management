export type CurrentUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_superuser: boolean
  role: string | null
  permissions: string[]
}

export type LoginResponse = {
  access: string
  refresh: string
  user: Pick<CurrentUser, "id" | "username" | "email" | "first_name" | "last_name" | "phone">
}

export type ApiErrorBody = {
  code?: string
  detail?: string
  errors?: Record<string, string[] | string>
}

import { canSee } from "../../layouts/nav.ts"
import { useAuth } from "./AuthContext.tsx"

export function useCan(permission: string) {
  const { user } = useAuth()
  return !!user && canSee(user, permission)
}

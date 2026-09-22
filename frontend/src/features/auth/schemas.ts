import { z } from "zod"

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
})

export const profileSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  first_name: z.string(),
  last_name: z.string(),
  phone: z.string(),
})

export const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required."),
  new_password: z.string().min(8, "Password must be at least 8 characters."),
})

export type LoginValues = z.infer<typeof loginSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type PasswordValues = z.infer<typeof passwordSchema>

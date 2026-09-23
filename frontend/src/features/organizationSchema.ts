import { z } from "zod"

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  code: z.string().trim().min(1, "Code is required."),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email.")]),
  phone: z.string(),
  contact_name: z.string(),
  address_line: z.string(),
  city: z.string(),
  country: z.string(),
  is_active: z.boolean(),
})

export type OrganizationValues = z.infer<typeof organizationSchema>

export const emptyOrganization: OrganizationValues = {
  name: "",
  code: "",
  email: "",
  phone: "",
  contact_name: "",
  address_line: "",
  city: "",
  country: "",
  is_active: true,
}

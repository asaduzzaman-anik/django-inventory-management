import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AuthProvider } from "../features/auth/AuthContext.tsx"
import { AppRoutes } from "./index.tsx"

describe("protected routes", () => {
  it("sends a logged-out visitor to sign in", async () => {
    render(
      <MemoryRouter initialEntries={["/profile"]}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
  })
})

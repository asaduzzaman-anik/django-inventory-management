import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthProvider } from "./AuthContext.tsx"
import { LoginPage } from "./LoginPage.tsx"

const loginRequest = vi.fn()
const fetchMe = vi.fn()

vi.mock("../../api/auth.ts", () => ({
  loginRequest: (...args: unknown[]) => loginRequest(...args),
  fetchMe: (...args: unknown[]) => fetchMe(...args),
  logoutRequest: vi.fn(),
}))

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe("login form", () => {
  beforeEach(() => {
    loginRequest.mockReset()
    fetchMe.mockReset()
  })

  it("requires a username and password", async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByText("Username is required.")).toBeInTheDocument()
    expect(screen.getByText("Password is required.")).toBeInTheDocument()
    expect(loginRequest).not.toHaveBeenCalled()
  })

  it("shows the API detail when sign-in is rejected", async () => {
    loginRequest.mockRejectedValue({
      response: {
        data: {
          detail: "No active account found with the given credentials.",
          errors: {},
        },
      },
    })
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText("Username"), "ada")
    await user.type(screen.getByLabelText("Password"), "wrong-password")
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No active account found with the given credentials.")
  })
})

import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { Spinner } from "../components/ui/Spinner.tsx"
import { ChangePasswordPage } from "../features/auth/ChangePasswordPage.tsx"
import { useAuth } from "../features/auth/AuthContext.tsx"
import { LoginPage } from "../features/auth/LoginPage.tsx"
import { ProfilePage } from "../features/auth/ProfilePage.tsx"
import { AppLayout } from "../layouts/AppLayout.tsx"
import { AuthLayout } from "../layouts/AuthLayout.tsx"
import { AccessDeniedPage } from "../pages/AccessDeniedPage.tsx"
import { DashboardPage } from "../pages/DashboardPage.tsx"
import { NotFoundPage } from "../pages/NotFoundPage.tsx"
import { PlaceholderPage } from "../pages/PlaceholderPage.tsx"

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) {
    return <Spinner />
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  if (!ready) {
    return <Spinner />
  }
  if (user) {
    return <Navigate to="/" replace />
  }
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route path="products" element={<PlaceholderPage title="Products" />} />
        <Route path="categories" element={<PlaceholderPage title="Categories" />} />
        <Route path="suppliers" element={<PlaceholderPage title="Suppliers" />} />
        <Route path="warehouses" element={<PlaceholderPage title="Warehouses" />} />
        <Route path="inventory" element={<PlaceholderPage title="Inventory" />} />
        <Route path="purchasing" element={<PlaceholderPage title="Purchasing" />} />
        <Route path="sales" element={<PlaceholderPage title="Sales" />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="admin" element={<PlaceholderPage title="Admin" />} />
        <Route path="access-denied" element={<AccessDeniedPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

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
import { CategoryListPage } from "../features/catalog/CategoryListPage.tsx"
import { ProductDetailPage } from "../features/catalog/ProductDetailPage.tsx"
import { ProductFormPage } from "../features/catalog/ProductFormPage.tsx"
import { ProductListPage } from "../features/catalog/ProductListPage.tsx"
import { SupplierDetailPage } from "../features/suppliers/SupplierDetailPage.tsx"
import { SupplierFormPage } from "../features/suppliers/SupplierFormPage.tsx"
import { SupplierListPage } from "../features/suppliers/SupplierListPage.tsx"
import { WarehouseDetailPage } from "../features/warehouses/WarehouseDetailPage.tsx"
import { WarehouseFormPage } from "../features/warehouses/WarehouseFormPage.tsx"
import { WarehouseListPage } from "../features/warehouses/WarehouseListPage.tsx"
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
        <Route path="products" element={<ProductListPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="categories" element={<CategoryListPage />} />
        <Route path="suppliers" element={<SupplierListPage />} />
        <Route path="suppliers/new" element={<SupplierFormPage />} />
        <Route path="suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="suppliers/:id/edit" element={<SupplierFormPage />} />
        <Route path="warehouses" element={<WarehouseListPage />} />
        <Route path="warehouses/new" element={<WarehouseFormPage />} />
        <Route path="warehouses/:id" element={<WarehouseDetailPage />} />
        <Route path="warehouses/:id/edit" element={<WarehouseFormPage />} />
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

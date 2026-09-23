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
import { DashboardPage } from "../features/dashboard/DashboardPage.tsx"
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
import { AdjustmentDetailPage } from "../features/inventory/AdjustmentDetailPage.tsx"
import { AdjustmentPage } from "../features/inventory/AdjustmentPage.tsx"
import { ReceiptDetailPage } from "../features/inventory/ReceiptDetailPage.tsx"
import { ReceivePage } from "../features/inventory/ReceivePage.tsx"
import { StockListPage } from "../features/inventory/StockListPage.tsx"
import { TransactionListPage } from "../features/inventory/TransactionListPage.tsx"
import { TransferDetailPage } from "../features/inventory/TransferDetailPage.tsx"
import { TransferPage } from "../features/inventory/TransferPage.tsx"
import { PurchaseDetailPage } from "../features/purchasing/PurchaseDetailPage.tsx"
import { PurchaseFormPage } from "../features/purchasing/PurchaseFormPage.tsx"
import { PurchaseListPage } from "../features/purchasing/PurchaseListPage.tsx"
import { SalesDetailPage } from "../features/sales/SalesDetailPage.tsx"
import { SalesFormPage } from "../features/sales/SalesFormPage.tsx"
import { SalesListPage } from "../features/sales/SalesListPage.tsx"
import { AuditLogPage } from "../features/admin/AuditLogPage.tsx"
import { UserDetailPage } from "../features/admin/UserDetailPage.tsx"
import { UserFormPage } from "../features/admin/UserFormPage.tsx"
import { UserListPage } from "../features/admin/UserListPage.tsx"
import { InventoryReportPage } from "../features/reports/InventoryReportPage.tsx"
import { MovementReportPage } from "../features/reports/MovementReportPage.tsx"
import { PurchaseReportPage } from "../features/reports/PurchaseReportPage.tsx"
import { SalesReportPage } from "../features/reports/SalesReportPage.tsx"

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
        <Route path="inventory" element={<StockListPage />} />
        <Route path="inventory/transactions" element={<TransactionListPage />} />
        <Route path="inventory/receive" element={<ReceivePage />} />
        <Route path="inventory/transfer" element={<TransferPage />} />
        <Route path="inventory/adjust" element={<AdjustmentPage />} />
        <Route path="inventory/receipts/:id" element={<ReceiptDetailPage />} />
        <Route path="inventory/transfers/:id" element={<TransferDetailPage />} />
        <Route path="inventory/adjustments/:id" element={<AdjustmentDetailPage />} />
        <Route path="purchasing" element={<PurchaseListPage />} />
        <Route path="purchasing/new" element={<PurchaseFormPage />} />
        <Route path="purchasing/:id" element={<PurchaseDetailPage />} />
        <Route path="purchasing/:id/edit" element={<PurchaseFormPage />} />
        <Route path="sales" element={<SalesListPage />} />
        <Route path="sales/new" element={<SalesFormPage />} />
        <Route path="sales/:id" element={<SalesDetailPage />} />
        <Route path="sales/:id/edit" element={<SalesFormPage />} />
        <Route path="reports" element={<Navigate to="/reports/inventory" replace />} />
        <Route path="reports/inventory" element={<InventoryReportPage />} />
        <Route path="reports/movements" element={<MovementReportPage />} />
        <Route path="reports/purchases" element={<PurchaseReportPage />} />
        <Route path="reports/sales" element={<SalesReportPage />} />
        <Route path="admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="admin/users" element={<UserListPage />} />
        <Route path="admin/users/new" element={<UserFormPage />} />
        <Route path="admin/users/:id" element={<UserDetailPage />} />
        <Route path="admin/audit-logs" element={<AuditLogPage />} />
        <Route path="access-denied" element={<AccessDeniedPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

/**
 * @fileoverview AdminRoute — Protected route wrapper untuk halaman-halaman admin.
 *
 * Membungkus semua route `/admin/*` dengan AdminLoginGate agar autentikasi
 * dijamin di level router, bukan bergantung pada masing-masing page.
 *
 * @module pages/admin/components/AdminRoute
 */

import AdminLoginGate from './AdminLoginGate';

/**
 * Wrapper komponen untuk route yang memerlukan autentikasi admin.
 *
 * Cara pakai di App.jsx:
 * @example
 * <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode | Function} props.children - Element atau function(adminProfile)
 */
export default function AdminRoute({ children }) {
  return <AdminLoginGate>{children}</AdminLoginGate>;
}

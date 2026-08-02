/**
 * @fileoverview Gate component untuk otentikasi halaman Admin.
 *
 * Component ini memeriksa status login admin dan menampilkan:
 * - Loading screen saat memuat sesi
 * - Form login jika belum login
 * - Pesan akses ditolak jika role bukan admin
 * - Children yang sudah terautentikasi jika login berhasil
 *
 * MENGGUNAKAN POLA "CHILDREN AS FUNCTION":
 * adminProfile langsung tersedia di halaman pemanggil tanpa context terpisah.
 *
 * @module pages/admin/components/AdminLoginGate
 * @requires react
 * @requires @tanstack/react-query
 * @requires lucide-react
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react';

import { fetchSesiAdmin, loginAdmin, logoutAdmin } from '../../../services/adminService';

// =============================================================================
// KOMPONEN UTAMA
// =============================================================================

/**
 * Gate/Guard untuk halaman-halaman Admin.
 *
 * Component ini membungkus seluruh halaman admin dan menangani:
 * 1. Pengecekan sesi login via React Query
 * 2. Form login jika belum ada sesi
 * 3. Pesan "akses ditolak" jika role bukan admin
 * 4. Render children dengan adminProfile jika sudah login
 *
 * POLA "CHILDREN AS FUNCTION":
 * - children adalah function: children(adminProfile)
 * - adminProfile langsung tersedia tanpa context/Redux
 *
 * @component
 * @param {Object} props - Props komponen
 * @param {Function} props.children - Function component yang menerima adminProfile
 * @returns {JSX.Element}
 *
 * @example
 * // Penggunaan di halaman admin
 * <AdminLoginGate>
 *   {(adminProfile) => (
 *     <AdminLayout adminProfile={adminProfile}>
 *       <h1>Halaman Admin</h1>
 *     </AdminLayout>
 *   )}
 * </AdminLoginGate>
 *
 * @example
 * // Tanpa children function (simple render)
 * <AdminLoginGate>
 *   <ProtectedContent />
 * </AdminLoginGate>
 */
export default function AdminLoginGate({ children }) {
  const queryClient = useQueryClient();

  // State form login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorLogin, setErrorLogin] = useState(null);
  const [sedangLogin, setSedangLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch sesi admin dari Supabase
  const {
    data: adminProfile,
    isLoading,
    refetch,
  } = useQuery({ queryKey: ['sesi-admin'], queryFn: fetchSesiAdmin });

  /**
   * Handle submit form login.
   * @param {React.FormEvent} e - Event submit form
   */
  async function handleLogin(e) {
    e.preventDefault();
    setErrorLogin(null);
    setSedangLogin(true);
    try {
      await loginAdmin(email, password);
      await queryClient.invalidateQueries({ queryKey: ['sesi-admin'] });
      const result = await refetch();
      if (result.error) {
        setErrorLogin(result.error.message);
        // Logout if profile fetch fails so they don't get stuck in a half-logged-in state
        logoutAdmin();
      }
    } catch (err) {
      setErrorLogin(err.message);
    } finally {
      setSedangLogin(false);
    }
  }

  // Tampilkan loading screen
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper via-slate-100 to-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-navy-200 animate-pulse" />
            </div>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-800 shadow-soft-lg">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-navy-700" />
          <p className="text-sm text-slate-500">Memuat...</p>
        </div>
      </div>
    );
  }

  // Tampilkan form login jika belum login
  if (!adminProfile) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-paper via-slate-50 to-slate-200 flex items-center justify-center p-4 sm:p-8">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-navy-200/40 to-blue-300/20 blur-[100px] mix-blend-multiply animate-pulse-soft" />
          <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-200/30 to-teal-300/20 blur-[120px] mix-blend-multiply animate-float" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-30" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in-up z-10">
          
          {/* Header / Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
              <div className="absolute inset-0 bg-gradient-to-tr from-navy-600 to-navy-800 rounded-2xl shadow-glow rotate-3 animate-wiggle opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-bl from-navy-700 to-navy-900 rounded-2xl -rotate-3" />
              <svg className="relative w-10 h-10 text-gold-400 drop-shadow-md z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-navy-900 tracking-tight">Login Admin</h1>
            <p className="text-slate-500 mt-2 font-medium">Masuk untuk mengakses panel administrasi</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-xl border border-white/50 overflow-hidden relative p-8">
            {/* Top Decorative Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-navy-400 via-emerald-400 to-navy-600 opacity-90" />

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {errorLogin && (
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-shake">
                  <div className="bg-red-100 p-2 rounded-xl flex-shrink-0">
                    <ShieldAlert className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-red-900">Login Ditolak</p>
                    <p className="text-sm text-red-700 mt-1">{errorLogin}</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="group space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-navy-800 transition-colors group-focus-within:text-navy-600">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400 group-focus-within:text-navy-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@email.com"
                    className="w-full pl-12 pr-4 py-3.5 text-navy-900 font-medium
                             bg-white/50 border-2 border-slate-200 rounded-2xl
                             focus:outline-none focus:border-navy-500 focus:bg-white focus:shadow-glow
                             placeholder:text-slate-400 placeholder:font-normal
                             transition-all duration-300"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="group space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-navy-800 transition-colors group-focus-within:text-navy-600">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-4 pr-12 py-3.5 text-navy-900 font-medium tracking-widest
                             bg-white/50 border-2 border-slate-200 rounded-2xl
                             focus:outline-none focus:border-navy-500 focus:bg-white focus:shadow-glow focus:tracking-normal
                             placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal
                             transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-navy-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sedangLogin}
                  className={`
                    relative w-full py-4 px-6 rounded-2xl font-bold text-white text-lg
                    flex items-center justify-center gap-3 overflow-hidden
                    transition-all duration-300 transform
                    ${!sedangLogin
                      ? 'bg-gradient-to-r from-navy-700 to-navy-800 hover:from-navy-600 hover:to-navy-700 active:scale-[0.98] shadow-soft-lg hover:shadow-glow hover:-translate-y-0.5'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    }
                  `}
                >
                  {!sedangLogin && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent hover:animate-shimmer" />
                  )}
                  
                  {sedangLogin ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Otentikasi...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-6 w-6" />
                      <span>Masuk Sistem</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Sub-Footer */}
            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Protected Area
              </p>
            </div>
          </div>

          {/* Branding */}
          <div className="mt-8 text-center animate-fade-in">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-700 transition-colors px-4 py-2 rounded-full hover:bg-white/50 mb-2"
            >
              ← Kembali ke Portal Utama
            </a>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} BPS Provinsi Kepulauan Bangka Belitung
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tampilkan pesan akses ditolak jika role bukan admin dan bukan kakan
  const isUserBiasa = adminProfile.role_admin === 'USER_BIASA' && !adminProfile.is_kakan;
  if (isUserBiasa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper via-slate-100 to-slate-200 px-4">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-red-200 shadow-soft-lg">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-800">Akses Ditolak</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">
            Akun ini tidak memiliki akses Admin. Silakan hubungi administrator untuk permintaan akses.
          </p>
        </div>
      </div>
    );
  }

  // Render children dengan adminProfile
  return typeof children === 'function' ? children(adminProfile) : children;
}

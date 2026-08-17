/**
 * @fileoverview Layout utama untuk halaman-halaman Admin.
 *
 * Menyediakan:
 * - Navigasi sidebar/header dengan menu admin
 * - Info profil admin yang login
 * - Tombol logout
 * - Responsive design (desktop + mobile)
 *
 * @module pages/admin/components/AdminLayout
 * @requires react
 * @requires react-router-dom
 * @requires @tanstack/react-query
 * @requires lucide-react
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  FilePlus2,
  Users,
  Trophy,
  RotateCcw,
  LogOut,
  MapPin,
  Menu,
  X,
  MessageSquare,
  Phone,
  Send,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { logoutAdmin } from '../../../services/adminService';

// =============================================================================
// KONFIGURASI NAVIGASI
// =============================================================================

/**
 * Konfigurasi menu navigasi sidebar/header.
 *
 * @constant {Array<{href: string, label: string, icon: Component}>}
 *
 * @example
 * // Menu navigasi yang tersedia:
 * // - Manajemen: /admin/kelola-periode
 * // - Pegawai: /admin/kelola-pegawai
 * // - Wilayah: /admin/kelola-wilayah
 * // - Dashboard: /admin/dashboard-kakan
 * // - Reset Token: /admin/reset-token
 */
const NAV = [
  { href: '/admin/kelola-periode', label: 'Manajemen', icon: FilePlus2 },
  { href: '/admin/kelola-pegawai', label: 'Pegawai', icon: Users },
  { href: '/admin/kelola-wilayah', label: 'Wilayah', icon: MapPin },
  {
    label: 'Pesan WA',
    icon: MessageSquare,
    subItems: [
      { href: '/admin/kelola-template-wa', label: 'Template WA', icon: MessageSquare },
      { href: '/admin/perkenalan-wa', label: 'Perkenalan WA', icon: Phone },
      { href: '/admin/kotak-keluar', label: 'Kotak Keluar', icon: Send },
    ],
  },
  { href: '/admin/dashboard-kakan', label: 'Dashboard', icon: Trophy },
  { href: '/admin/reset-token', label: 'Reset Token', icon: RotateCcw },
];

// =============================================================================
// KOMPONEN
// =============================================================================

/**
 * Layout utama untuk halaman Admin.
 *
 * Menampilkan:
 * - Header dengan logo, navigasi, dan info user
 * - Konten utama dari props children
 * - Footer dengan copyright
 *
 * @component
 * @param {Object} props - Props komponen
 * @param {Object} props.adminProfile - Profil admin yang login
 * @param {string} props.adminProfile.nama - Nama admin
 * @param {string} props.adminProfile.role_admin - Role admin
 * @param {React.ReactNode} props.children - Konten halaman
 * @returns {JSX.Element}
 *
 * @example
 * // Penggunaan di halaman admin
 * <AdminLayout adminProfile={admin}>
 *   <h1>Halaman Manajemen</h1>
 * </AdminLayout>
 */
export default function AdminLayout({ adminProfile, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Jika user HANYA kakan (USER_BIASA) dan mencoba akses selain dashboard kakan
    if (adminProfile?.role_admin === 'USER_BIASA' && location.pathname !== '/admin/dashboard-kakan') {
      navigate('/admin/dashboard-kakan', { replace: true });
    }
  }, [adminProfile, location.pathname, navigate]);

  const filteredNav = NAV.filter(item => {
    if (adminProfile?.role_admin === 'USER_BIASA') {
      return item.href === '/admin/dashboard-kakan';
    }
    return true;
  });

  /**
   * Handle logout admin.
   * Memanggil logoutAdmin dari service dan invalidate query sesi.
   */
  async function handleLogout() {
    await logoutAdmin();
    queryClient.invalidateQueries({ queryKey: ['sesi-admin'] });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-paper via-slate-50 to-slate-200">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-navy-200/30 to-blue-300/10 blur-[100px] mix-blend-multiply animate-pulse-soft" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-200/20 to-teal-300/10 blur-[120px] mix-blend-multiply animate-float" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-20" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-xl shadow-soft">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo & Brand */}
            <Link 
              to={adminProfile?.role_admin === 'USER_BIASA' ? '/admin/dashboard-kakan' : '/admin'}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-800 text-white shadow-lg">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-display text-lg font-bold leading-tight whitespace-nowrap text-navy-900">Babel Memilih</h1>
                <p className="text-[10px] leading-tight text-slate-500">Admin Panel</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center mx-2 px-2">
              {filteredNav.map((item) => {
                if (item.subItems) {
                  const isActive = item.subItems.some(sub => location.pathname === sub.href);
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="relative group">
                      <button className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive ? 'bg-navy-800 text-white shadow-lg shadow-navy-800/25' : 'text-slate-600 hover:bg-slate-100 hover:text-navy-800'}`}>
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : ''}`} />
                        {item.label}
                        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform group-hover:rotate-180 ${isActive ? 'text-white/70' : 'opacity-50'}`} />
                      </button>
                      <div className="absolute left-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-2">
                          {item.subItems.map(sub => (
                            <Link key={sub.href} to={sub.href} className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${location.pathname === sub.href ? 'text-navy-800 bg-slate-50 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-navy-800'}`}>
                              <sub.icon className="h-4 w-4" />
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                const aktif = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      aktif
                        ? 'bg-navy-800 text-white shadow-lg shadow-navy-800/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-navy-800'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${aktif ? 'text-white' : ''}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu & Mobile Toggle */}
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="hidden md:flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-100">
                <img
                  src={adminProfile.foto_url || (adminProfile.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${adminProfile.nip}.jpg` : `https://ui-avatars.com/api/?name=${encodeURIComponent(adminProfile.nama || 'Admin')}&background=16324a&color=fff&size=128`)}
                  alt={adminProfile.nama}
                  className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-sm transition-transform duration-200 hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminProfile.nama || 'Admin')}&background=16324a&color=fff&size=128`;
                  }}
                />
                <div className="text-left">
                  <p className="text-sm font-bold text-navy-900 leading-tight whitespace-nowrap">
                    {adminProfile.nama || 'Administrator'}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight whitespace-nowrap">
                    {adminProfile.role_admin}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="lg:hidden py-4 border-t border-slate-100 animate-fade-in">
              <div className="flex flex-col gap-1">
                {filteredNav.map((item) => {
                  if (item.subItems) {
                    return (
                      <div key={item.label} className="flex flex-col gap-1">
                        <div className="px-4 py-2 mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</div>
                        {item.subItems.map((sub) => {
                          const aktif = location.pathname === sub.href;
                          const Icon = sub.icon;
                          return (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 rounded-xl px-4 py-3 pl-8 text-sm font-medium transition-all duration-200 ${
                                aktif
                                  ? 'bg-navy-800 text-white shadow-lg'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  }

                  const aktif = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        aktif
                          ? 'bg-navy-800 text-white shadow-lg'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/40 bg-white/40 backdrop-blur-md py-4 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-center text-xs text-slate-500 font-medium">
            Sistem Penilaian Pegawai © {new Date().getFullYear()} • Dibuat dengan ❤️
          </p>
        </div>
      </footer>
    </div>
  );
}

import { Routes, Route } from 'react-router-dom';
import VerifikasiPenilai from './pages/link-unik/VerifikasiPenilai';
import PenilaiPage from './pages/link-unik/PenilaiPage';
import JuriPage from './pages/link-unik/JuriPage';
import NomineePage from './pages/link-unik/NomineePage';
import KelolaPeriode from './pages/admin/kelola-periode';
import DashboardKakan from './pages/admin/DashboardKakan';
import KelolaWilayah from './pages/admin/KelolaWilayah';
import KelolaPegawai from './pages/admin/KelolaPegawai';
import AdminDashboard from './pages/admin/AdminDashboard';
import ResetToken from './pages/admin/ResetToken';
import KelolaTemplateWA from './pages/admin/KelolaTemplateWA';
import PerkenalanNomorWA from './pages/admin/PerkenalanNomorWA';
import KotakKeluar from './pages/admin/KotakKeluar';
import { Toaster } from 'react-hot-toast';

function PlaceholderPage({ judul, keterangan }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper to-slate-100/50 px-4">
      <div className="text-center animate-fade-in">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <span className="text-2xl font-bold text-slate-400">{judul}</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800">{judul}</h1>
        <p className="mt-2 text-sm text-slate-500">{keterangan}</p>
      </div>
    </div>
  );
}

import { ArrowRight, Fingerprint, Database, Award } from 'lucide-react';
import { getDailyAvatarUrl } from './utils/constants';

function PortalLandingPage() {
  const girlAvatarSrc = getDailyAvatarUrl('girl');
  const boyAvatarSrc = getDailyAvatarUrl('boy');

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-paper via-slate-50 to-slate-200 flex items-center justify-center p-4 sm:p-8">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-navy-200/40 to-blue-300/20 blur-[100px] mix-blend-multiply animate-pulse-soft" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-200/30 to-teal-300/20 blur-[120px] mix-blend-multiply animate-float" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-30" />
      </div>

      {/* Floating Avatar Left - Same position as VerifikasiPenilai */}
      <div className="absolute top-1/2 -translate-y-[35%] z-0 pointer-events-none left-1/2 -translate-x-[80%] opacity-20 lg:left-auto lg:right-1/2 lg:translate-x-0 lg:mr-[270px] xl:mr-[320px] lg:opacity-100">
        <img
          src={girlAvatarSrc}
          alt="Pegawai Perempuan"
          className="h-[400px] lg:h-[500px] xl:h-[620px] w-auto drop-shadow-2xl animate-float"
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Floating Avatar Right - Same position as VerifikasiPenilai */}
      <div className="absolute top-1/2 -translate-y-[35%] z-0 pointer-events-none right-1/2 translate-x-[80%] opacity-20 lg:right-auto lg:left-1/2 lg:translate-x-0 lg:ml-[270px] xl:ml-[320px] lg:opacity-100">
        <img
          src={boyAvatarSrc}
          alt="Pegawai Laki-laki"
          className="h-[400px] lg:h-[500px] xl:h-[620px] w-auto drop-shadow-2xl animate-float"
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <div className="relative w-full max-w-lg animate-fade-in-up z-10">
        
        {/* Header / Logo */}
        <div className="text-center mb-10">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-navy-600 to-navy-800 rounded-3xl shadow-glow rotate-3 animate-wiggle opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-bl from-navy-700 to-navy-900 rounded-3xl -rotate-3" />
            <Award className="relative w-12 h-12 text-gold-400 drop-shadow-md z-10" />
          </div>
          <h1 className="text-4xl font-display font-bold text-navy-900 tracking-tight mb-2">Babel Memilih</h1>
          <p className="text-slate-500 font-medium text-lg">Sistem Penilaian Pegawai Berprestasi</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-soft-xl border border-white/60 overflow-hidden relative p-8 sm:p-10">
          
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-navy-400 via-emerald-400 to-gold-400 opacity-90" />

          <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">Pilih Pintu Masuk</p>

          <div className="space-y-5">
            {/* Admin Button */}
            <a
              href="/admin"
              className="group relative flex items-center justify-between rounded-2xl border-2 border-slate-100 bg-white p-5 transition-all duration-300 hover:border-navy-300 hover:shadow-soft-lg hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-navy-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-md group-hover:shadow-glow transition-shadow">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-lg">Portal Admin</h3>
                  <p className="text-sm text-slate-500 font-medium">Manajemen sistem & Kakan</p>
                </div>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-navy-100 group-hover:text-navy-700 transition-colors">
                <ArrowRight className="w-5 h-5" />
              </div>
            </a>

            {/* Verifikasi Penilai Button */}
            <a
              href="/penilai"
              className="group relative flex items-center justify-between rounded-2xl border-2 border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 p-5 transition-all duration-300 hover:border-emerald-400 hover:shadow-glow-gold hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md group-hover:shadow-lg transition-shadow">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 text-lg flex items-center gap-2">
                    Akses Pegawai
                    <span className="px-2 py-0.5 rounded-md bg-gold-400 text-navy-900 text-[10px] font-bold uppercase tracking-wider">Verifikasi</span>
                  </h3>
                  <p className="text-sm text-emerald-700/80 font-medium">Masuk dengan NIP & HP</p>
                </div>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100/50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5" />
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-sm font-medium text-slate-400">
            © {new Date().getFullYear()} BPS Provinsi Kepulauan Bangka Belitung
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
      <Routes>
        <Route path="/" element={<PortalLandingPage />} />
        <Route path="/penilai" element={<VerifikasiPenilai />} />
        <Route path="/penilai/:token" element={<PenilaiPage />} />
        <Route path="/juri" element={<JuriPage />} />
        <Route path="/nominee" element={<NomineePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/kelola-periode" element={<KelolaPeriode />} />
        <Route path="/admin/kelola-wilayah" element={<KelolaWilayah />} />
        <Route path="/admin/kelola-pegawai" element={<KelolaPegawai />} />
        <Route path="/admin/dashboard-kakan" element={<DashboardKakan />} />
        <Route path="/admin/reset-token" element={<ResetToken />} />
        <Route path="/admin/kelola-template-wa" element={<KelolaTemplateWA />} />
        <Route path="/admin/perkenalan-wa" element={<PerkenalanNomorWA />} />
        <Route path="/admin/kotak-keluar" element={<KotakKeluar />} />
        <Route path="*" element={<PlaceholderPage judul="404" keterangan="Halaman tidak ditemukan." />} />
      </Routes>
    </>
  );
}

export default App;

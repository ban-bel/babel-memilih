/**
 * @fileoverview Screen status untuk kondisi non-aktif token akses.
 *
 * Menampilkan pesan sesuai status token:
 * - BELUM_DIBUKA: Periode belum dimulai
 * - TELAH_DITUTUP: Periode sudah ditutup
 * - SUDAH_DIGUNAKAN: Token sudah dipakai
 * - TOKEN_TIDAK_VALID: Token tidak valid/tidak ditemukan
 *
 * @module components/common/StatusScreen
 */

import { Clock, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { STATUS_AKSES_TOKEN } from '../../utils/constants';

/**
 * Konfigurasi tampilan per status.
 *
 * @constant {Object}
 */
const KONFIGURASI = {
  /** Periode belum dimulai (sekarang < tgl_mulai) */
  [STATUS_AKSES_TOKEN.BELUM_DIBUKA]: {
    icon: Clock,
    judul: 'Periode Penilaian Belum Dibuka',
    subjudul: 'Sabar ya!',
    warna: 'text-amber-600 bg-amber-50 border-amber-200',
    gradient: 'from-amber-50 to-orange-50',
    iconBg: 'bg-amber-100',
  },

  /** Periode sudah ditutup (sekarang > tgl_selesai atau status SELESAI/DIARSIPKAN) */
  [STATUS_AKSES_TOKEN.TELAH_DITUTUP]: {
    icon: Lock,
    judul: 'Periode Penilaian Ditutup',
    subjudul: 'Waktu sudah habis',
    warna: 'text-slate-600 bg-slate-50 border-slate-200',
    gradient: 'from-slate-50 to-slate-100',
    iconBg: 'bg-slate-100',
  },

  /** Token sudah digunakan (is_digunakan = true) */
  [STATUS_AKSES_TOKEN.SUDAH_DIGUNAKAN]: {
    icon: CheckCircle2,
    judul: 'Token Sudah Terisi',
    subjudul: 'Akses ditutup',
    warna: 'text-navy-700 bg-navy-50 border-navy-200',
    gradient: 'from-navy-50 to-indigo-50',
    iconBg: 'bg-navy-100',
  },

  /** Token tidak valid atau tidak ditemukan */
  [STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID]: {
    icon: XCircle,
    judul: 'Link Tidak Valid',
    subjudul: 'Token tidak ditemukan',
    warna: 'text-red-600 bg-red-50 border-red-200',
    gradient: 'from-red-50 to-rose-50',
    iconBg: 'bg-red-100',
  },
};

/**
 * Screen status untuk kondisi non-aktif token akses.
 *
 * Menampilkan pesan sesuai status:
 * - Icon berbeda per status
 * - Warna dan gradient berbeda
 * - Pesan default atau custom keterangan
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {string} props.status - Status token (dari STATUS_AKSES_TOKEN)
 * @param {string} [props.keterangan] - Keterangan kustom (opsional)
 *
 * @example
 * // Token tidak valid
 * <StatusScreen status={STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID} />
 *
 * @example
 * // Dengan keterangan kustom
 * <StatusScreen
 *   status={STATUS_AKSES_TOKEN.BELUM_DIBUKA}
 *   keterangan="Periode akan dibuka pada 1 Agustus 2026"
 * />
 */
export default function StatusScreen({ status, keterangan }) {
  // Fallback ke TOKEN_TIDAK_VALID jika status tidak dikenal
  const cfg = KONFIGURASI[status] ?? KONFIGURASI[STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID];
  const Icon = cfg.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper via-slate-100/50 to-slate-200/30 px-4">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-navy-100/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-gold-100/30 to-transparent blur-3xl" />
      </div>

      {/* Status Card */}
      <div className={`relative w-full max-w-sm animate-fade-in-up rounded-3xl border ${cfg.warna} bg-gradient-to-b ${cfg.gradient} p-1 shadow-soft-xl`}>
        <div className="rounded-[1.1rem] bg-white/80 backdrop-blur-sm p-8 text-center">
          {/* Icon */}
          <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl ${cfg.iconBg} shadow-soft-lg animate-bounce-in`}>
            <Icon className="h-10 w-10" aria-hidden="true" />
          </div>

          {/* Title */}
          <h1 className="font-display text-xl font-bold text-slate-900">{cfg.judul}</h1>
          <p className="mt-1 text-sm text-slate-500">{cfg.subjudul}</p>

          {/* Description */}
          {keterangan ? (
            <p className="mt-4 rounded-xl bg-slate-50/80 p-4 text-sm text-slate-600 border border-slate-100">
              {keterangan}
            </p>
          ) : (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Hubungi administrator jika Anda merasa ini adalah kesalahan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

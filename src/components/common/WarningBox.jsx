/**
 * @fileoverview Komponen kotak peringatan/notice.
 *
 * Menyediakan kotak alert dengan berbagai variant warna:
 * - Kuning: Peringatan umum
 * - Biru: Informasi
 * - Merah: Error/Bahaya
 * - Hijau: Sukses
 *
 * @module components/common/WarningBox
 */

import { ShieldAlert, Info, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Komponen kotak peringatan/notice.
 *
 * Menampilkan pesan dalam kotak dengan:
 * - Icon sesuai variant
 * - Border kiri warna
 * - Background gradient
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {'kuning'|'biru'|'merah'|'hijau'} [props.variant='kuning'] - Variant warna
 * @param {string} [props.title] - Judul opsional (bold)
 * @param {React.ReactNode} props.children - Isi pesan
 * @param {string} [props.customClass] - Class kustom tambahan
 *
 * @example
 * // Warning kuning
 * <WarningBox variant="kuning" title="Peringatan:">
 *   Link ini hanya bisa digunakan sekali.
 * </WarningBox>
 *
 * @example
 * // Info biru
 * <WarningBox variant="biru">
 *   Periode akan ditutup pada 31 Juli 2026.
 * </WarningBox>
 *
 * @example
 * // Error merah
 * <WarningBox variant="merah" title="Error:">
 *   Terjadi kesalahan saat menyimpan data.
 * </WarningBox>
 */
export default function WarningBox({ variant = 'kuning', title, children, customClass = '' }) {
  /**
   * Konfigurasi style per variant.
   * @type {Object}
   */
  const styles = {
    kuning: {
      border: 'border-gold-400/50',
      bg: 'bg-gradient-to-r from-gold-50/50 to-gold-50/30',
      text: 'text-amber-800',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    biru: {
      border: 'border-blue-400/50',
      bg: 'bg-gradient-to-r from-blue-50/50 to-blue-50/30',
      text: 'text-blue-800',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    merah: {
      border: 'border-red-400/50',
      bg: 'bg-gradient-to-r from-red-50/50 to-red-50/30',
      text: 'text-red-800',
      icon: 'text-red-600',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    hijau: {
      border: 'border-emerald-400/50',
      bg: 'bg-gradient-to-r from-emerald-50/50 to-emerald-50/30',
      text: 'text-emerald-800',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
  };

  const style = styles[variant] || styles.kuning;

  /**
   * Pilih icon sesuai variant.
   * @type {Component}
   */
  const IconComponent =
    variant === 'merah'
      ? AlertTriangle
      : variant === 'hijau'
        ? CheckCircle
        : variant === 'biru'
          ? Info
          : ShieldAlert;

  return (
    <div
      className={`flex gap-3 rounded-xl border-l-4 ${style.border} ${style.bg} px-4 py-3 shadow-sm transition-all duration-200 hover:shadow-md ${customClass}`}
    >
      {/* Icon */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
        <IconComponent className={`h-4 w-4 ${style.iconColor}`} aria-hidden="true" />
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed ${style.text}`}>
        {title ? <span className="font-semibold">{title} </span> : null}
        {children}
      </p>
    </div>
  );
}

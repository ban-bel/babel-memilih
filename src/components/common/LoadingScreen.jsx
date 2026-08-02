/**
 * @fileoverview Komponen screen loading/placeholder.
 *
 * Ditampilkan saat aplikasi sedang:
 * - Fetch data dari API
 * - Memproses autentikasi
 * - Loading state lainnya
 *
 * @module components/common/LoadingScreen
 */

import { Loader2 } from 'lucide-react';

/**
 * Screen loading dengan animasi.
 *
 * Menampilkan:
 * - Logo animasi berputar
 * - Teks label customizable
 * - Loading dots animation
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {string} [props.label='Memuat…'] - Teks label loading
 *
 * @example
 * // Loading dengan label default
 * <LoadingScreen />
 *
 * @example
 * // Loading dengan label custom
 * <LoadingScreen label="Memuat data nominee..." />
 */
export default function LoadingScreen({ label = 'Memuat…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper via-slate-100/50 to-slate-200/30 px-4">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Animated Logo */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-navy-200/50 animate-pulse" />
          </div>
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-700 to-navy-800 shadow-soft-lg">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center">
          <p className="text-sm font-medium text-navy-800 animate-pulse">{label}</p>
          <p className="text-xs text-slate-400 mt-1">Mohon tunggu sebentar...</p>
        </div>

        {/* Loading Dots */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-navy-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-navy-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

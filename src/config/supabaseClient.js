/**
 * @fileoverview Konfigurasi client Supabase untuk aplikasi.
 *
 * DUA JALUR AKSES MENGGUNAKAN CLIENT INI:
 *
 * 1. JALUR ADMIN (Login Password):
 *    - Super Admin / Admin Web / Kakan
 *    - Memanfaatkan sesi Supabase Auth
 *    - persistSession + autoRefreshToken aktif
 *
 * 2. JALUR TOKEN PUBLIK (Zero-Trust Token):
 *    - Penilai / Juri / Nominee
 *    - TIDAK memerlukan login
 *    - Cukup anon key + validasi token manual
 *    - RLS dibuat permissive (USING true) untuk mendukung pola ini
 *
 * ENVIRONMENT VARIABLES (WAJIB):
 * - VITE_SUPABASE_URL: URL project Supabase Anda
 * - VITE_SUPABASE_ANON_KEY: Anon key dari Supabase Dashboard
 *
 * @module config/supabaseClient
 * @requires @supabase/supabase-js
 * @see {@link https://supabase.com/docs/guides/client/react|Supabase React Client}
 *
 * @example
 * // Penggunaan dasar
 * import { supabase } from './config/supabaseClient';
 *
 * // Query data
 * const { data } = await supabase.from('pegawai').select('*');
 *
 * @example
 * // Login (jalur admin)
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'admin@example.com',
 *   password: 'password123'
 * });
 */

import { createClient } from '@supabase/supabase-js';

// Re-export createClient for use in other modules
export { createClient };

// =============================================================================
// KONFIGURASI
// =============================================================================

/** URL project Supabase dari environment variable. */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/** Anon key Supabase dari environment variable. */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Validasi konfigurasi environment variable.
 * Gagal cepat & jelas saat development daripada error samar di runtime.
 *
 * @throws {Error} Jika VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diatur
 */
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabaseClient] VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diatur. ' +
      'Salin .env.example menjadi .env lalu isi kredensial project Supabase Anda.'
  );
}

// =============================================================================
// CLIENT INSTANCE
// =============================================================================

/**
 * Instansi Supabase client singleton.
 *
 * Konfigurasi Auth:
 * - persistSession: Sesi admin tersimpan di localStorage, tetap login setelah refresh
 * - autoRefreshToken: Token auth di-refresh otomatis sebelum expired
 * - detectSessionInUrl: Mendukung alur reset password / magic link
 *
 * @constant {SupabaseClient} supabase
 *
 * @example
 * // Query tabel
 * const { data, error } = await supabase.from('pegawai').select('*');
 *
 * @example
 * // Login admin
 * await supabase.auth.signInWithPassword({ email, password });
 *
 * @example
 * // Logout admin
 * await supabase.auth.signOut();
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /**
     * Sesi auth disimpan di localStorage.
     *WAJIB true agar admin tetap login setelah page refresh.
     * @type {boolean}
     */
    persistSession: true,

    /**
     * Token di-refresh otomatis sebelum expired.
     * @type {boolean}
     */
    autoRefreshToken: true,

    /**
     * Deteksi sesi dari URL (untuk magic link, reset password).
     * @type {boolean}
     */
    detectSessionInUrl: true,
  },
});

/**
 * Export default untuk konsistensi import.
 * @see supabase
 */
export default supabase;

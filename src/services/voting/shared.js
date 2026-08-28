import { supabase, createClient } from '../../config/supabaseClient';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function pastikanTokenValid(token) {
  if (typeof token !== 'string' || !UUID_REGEX.test(token)) {
    throw new Error('Format token pada link tidak valid.');
  }
}

export async function tandaiTokenTerpakai(rpcName, token) {
  const { error } = await supabase.rpc(rpcName, { p_token: token });

  if (error) {
    throw new Error(
      'Data penilaian berhasil tersimpan, namun status token gagal diperbarui. ' +
        'Mohon segera hubungi Admin agar tidak terjadi kesalahan submit ganda. ' +
        `Detail teknis: ${error.message}`
    );
  }
}

/**
 * Get Supabase client dengan Service Role Key untuk operasi admin.
 * Digunakan untuk operasi yang memerlukan bypass RLS.
 *
 * CATATAN KEAMANAN: Service Role Key memberikan akses FULL ke database.
 * Hanya gunakan untuk operasi admin yang memang memerlukan elevated privileges.
 */
export function getAdminSupabase() {
  const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  // Fallback: gunakan client biasa jika service key tidak tersedia
  console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY tidak tersedia - menggunakan client biasa');
  return supabase;
}

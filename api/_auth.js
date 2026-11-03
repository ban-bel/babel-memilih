/**
 * @fileoverview Helper autentikasi untuk Vercel serverless functions.
 *
 * File berawalan underscore tidak dijadikan route oleh Vercel.
 *
 * Memverifikasi header `Authorization: Bearer <access_token Supabase>`:
 * 1. Token divalidasi ke Supabase Auth (/auth/v1/user).
 * 2. Profil pegawai diambil dengan token user (RLS tetap berlaku).
 * 3. Hanya admin (role_admin != USER_BIASA) atau Kakan yang diizinkan —
 *    aturan yang sama dengan AdminLoginGate di frontend.
 */

const SUPABASE_URL = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ ok: true, user: object, pegawai: object } | { ok: false, status: number, message: string }>}
 */
export async function verifikasiAdmin(req) {
  const url = SUPABASE_URL();
  const anonKey = SUPABASE_ANON_KEY();
  if (!url || !anonKey) {
    return { ok: false, status: 500, message: 'Konfigurasi Supabase server tidak lengkap.' };
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return { ok: false, status: 401, message: 'Tidak terautentikasi.' };
  }
  const accessToken = match[1].trim();

  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) {
      return { ok: false, status: 401, message: 'Sesi tidak valid atau kedaluwarsa.' };
    }
    const user = await userRes.json();
    if (!user?.id) {
      return { ok: false, status: 401, message: 'Sesi tidak valid.' };
    }

    const profilRes = await fetch(
      `${url}/rest/v1/pegawai?select=id,role_admin,is_kakan&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } }
    );
    if (!profilRes.ok) {
      return { ok: false, status: 403, message: 'Profil admin tidak dapat diverifikasi.' };
    }
    const [pegawai] = await profilRes.json();
    const isAdmin = pegawai && (pegawai.is_kakan || (pegawai.role_admin && pegawai.role_admin !== 'USER_BIASA'));
    if (!isAdmin) {
      return { ok: false, status: 403, message: 'Akses ditolak.' };
    }

    return { ok: true, user, pegawai };
  } catch (err) {
    console.error('verifikasiAdmin error:', err);
    return { ok: false, status: 500, message: 'Gagal memverifikasi sesi.' };
  }
}

/** Escape karakter HTML untuk interpolasi aman ke template email. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const EMAIL_REGEX = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

/** Buang CR/LF untuk mencegah header injection. */
export function stripNewlines(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

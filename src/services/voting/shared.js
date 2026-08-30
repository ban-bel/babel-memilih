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


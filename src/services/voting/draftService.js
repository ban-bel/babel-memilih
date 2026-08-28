import { supabase } from '../../config/supabaseClient';
import { pastikanTokenValid, tandaiTokenTerpakai, UUID_REGEX, getAdminSupabase } from './shared';
import {
  STORAGE_BUCKET_BUKTI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES
} from '../../utils/constants';

export async function selesaikanPengisianNominee(token) {
  await tandaiTokenTerpakai('tandai_akses_nominee_terpakai', token);
}

/**
 * Ambil jawaban narasi/file yang sudah tersimpan nominee.
 * Dipakai untuk resume/prefill form.
 *
 * @async
 * @function fetchJawabanNominee
 * @param {number} periodeId - ID periode
 * @param {number} nomineeId - ID nominee
 * @returns {Promise<Object[]>} Array jawaban
 *
 * @example
 * const jawaban = await fetchJawabanNominee(1, 5);
 * // [{ pertanyaan_id, teks_jawaban, file_url, updated_at }, ...]
 */

export async function saveDraftToServer(token, mode, data) {
  const { error } = await supabase.rpc('save_draft_penilai', {
    p_token: token,
    p_mode: mode,
    p_draft_data: data
  });
  if (error) throw new Error('Gagal menyimpan draft ke server: ' + error.message);
}

/**
 * Mengambil draft dari server
 * @async
 * @param {string} token 
 * @param {string} mode - "1A", "1C", "2", "2A"
 * @returns {Promise<Object|null>} Objek JSON draft
 */

export async function getDraftFromServer(token, mode) {
  const { data, error } = await supabase.rpc('get_draft_penilai', {
    p_token: token,
    p_mode: mode
  });
  if (error) throw new Error('Gagal mengambil draft dari server: ' + error.message);
  return data;
}





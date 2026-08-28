import { supabase } from '../../config/supabaseClient';
import { pastikanTokenValid, tandaiTokenTerpakai, UUID_REGEX, getAdminSupabase } from './shared';
import {
  STORAGE_BUCKET_BUKTI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES
} from '../../utils/constants';

export async function submitJawabanNominee(token, pertanyaanId, teksJawaban) {
  pastikanTokenValid(token);

  const { error } = await supabase.rpc('submit_jawaban_nominee', {
    p_token: token,
    p_pertanyaan_id: pertanyaanId,
    p_teks_jawaban: teksJawaban,
    p_file_url: null,
  });

  if (error) {
    throw new Error(`Gagal menyimpan jawaban narasi: ${error.message}`);
  }
}

/**
 * Upload dokumen bukti ke Supabase Storage dan simpan path ke database.
 *
 * FILE VALIDATION:
 * - Tipe: PDF, Word, Excel, PowerPoint
 * - Ukuran: Maksimal 10MB
 *
 * @async
 * @function uploadBuktiPDF
 * @param {string} token - UUID token nominee dari URL
 * @param {number} periodeId - ID periode (untuk path storage)
 * @param {number} nomineeId - ID nominee (untuk path storage)
 * @param {number} pertanyaanId - ID pertanyaan (untuk path storage)
 * @param {File} file - Objek File dari input[type=file]
 * @returns {Promise<string>} Path file di storage
 * @throws {Error} Jika validasi gagal atau upload error
 *
 * @example
 * const path = await uploadBuktiPDF(token, 1, nomineeId, 1, fileInput.files[0]);
 */

export async function fetchJawabanNominee(periodeId, nomineeId) {
  const { data, error } = await supabase
    .from('jawaban_nominee')
    .select('pertanyaan_id, teks_jawaban, file_url, updated_at')
    .eq('periode_id', periodeId)
    .eq('nominee_id', nomineeId);

  if (error) throw new Error(`Gagal memuat jawaban tersimpan: ${error.message}`);
  return data ?? [];
}

/**
 * Ambil seluruh jawaban narasi semua nominee pada periode.
 * Dipakai halaman Penilai untuk membaca jawaban nominee.
 *
 * @async
 * @function fetchAllJawabanNominee
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array jawaban semua nominee
 */

export async function fetchAllJawabanNominee(periodeId) {
  const { data, error } = await supabase
    .from('jawaban_nominee')
    .select('nominee_id, pertanyaan_id, teks_jawaban, file_url, updated_at, pertanyaan:pertanyaan_id(teks_pertanyaan)')
    .eq('periode_id', periodeId);

  if (error) throw new Error(`Gagal memuat seluruh jawaban nominee: ${error.message}`);
  return data ?? [];
}

/**
 * Alias untuk fetchPertanyaanMode1A.
 *
 * Tabel `pertanyaan` dipakai bersama evaluator Mode 1A (skor)
 * DAN nominee (jawaban narasi). Alias ini membedakan konteks pemanggilan.
 */

export async function adminUpdateDaftarJawaban(periodeId, nomineeId, daftarJawaban) {
  const adminDb = getAdminSupabase();
  for (const item of daftarJawaban) {
    const { data: existing, error: errExisting } = await adminDb
      .from('jawaban_nominee')
      .select('id')
      .eq('periode_id', periodeId)
      .eq('nominee_id', nomineeId)
      .eq('pertanyaan_id', item.pertanyaan_id)
      .maybeSingle();
    
    if (errExisting) throw new Error(errExisting.message);
    
    if (existing) {
      if (item.teks_jawaban) {
        const { error } = await adminDb.from('jawaban_nominee').update({ teks_jawaban: item.teks_jawaban }).eq('id', existing.id);
        if (error) throw new Error("Gagal update: " + error.message);
      } else {
        const { error } = await adminDb.from('jawaban_nominee').delete().eq('id', existing.id);
        if (error) throw new Error("Gagal delete: " + error.message);
      }
    } else if (item.teks_jawaban) {
      const { error } = await adminDb.from('jawaban_nominee').insert({
        periode_id: periodeId,
        nominee_id: nomineeId,
        pertanyaan_id: item.pertanyaan_id,
        teks_jawaban: item.teks_jawaban
      });
      if (error) throw new Error("Gagal insert: " + error.message);
    }
  }
}

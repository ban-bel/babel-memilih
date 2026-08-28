import { supabase } from '../../config/supabaseClient';
import { pastikanTokenValid, tandaiTokenTerpakai, UUID_REGEX, getAdminSupabase } from './shared';
import {
  STORAGE_BUCKET_BUKTI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES
} from '../../utils/constants';

export async function fetchKeputusanKakan(periodeId) {
  const { data, error } = await supabase
    .from('keputusan_kakan')
    .select('id, pemenang_id, catatan_pertimbangan, created_at, pemenang:pegawai!keputusan_kakan_pemenang_id_fkey(id, nama, foto_url)')
    .eq('periode_id', periodeId)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal memuat status keputusan pemenang: ${error.message}`);
  }
  return data;
}

/**
 * Kunci keputusan pemenang resmi.
 *
 * Menggunakan UPSERT sehingga keputusan bisa direvisi sebelum periode ditutup.
 *
 * @async
 * @function kuncikanPemenang
 * @param {number} periodeId - ID periode
 * @param {number} kakanId - ID Kakan/Ketua Juri yang memutuskan
 * @param {number} pemenangId - ID nominee pemenang
 * @param {string} catatanPertimbangan - Catatan/alasan pemilihan
 * @throws {Error} Jika validasi gagal atau save error
 */

export async function kuncikanPemenang(periodeId, kakanId, pemenangId, catatanPertimbangan) {
  if (!pemenangId) {
    throw new Error('Silakan pilih nominee pemenang.');
  }
  if (!catatanPertimbangan || !catatanPertimbangan.trim()) {
    throw new Error('Catatan pertimbangan wajib diisi.');
  }

  const { error } = await supabase
    .from('keputusan_kakan')
    .upsert(
      {
        periode_id: periodeId,
        kakan_id: kakanId,
        pemenang_id: pemenangId,
        catatan_pertimbangan: catatanPertimbangan.trim(),
      },
      { onConflict: 'periode_id' }
    );

  if (error) {
    throw new Error(`Gagal mengunci keputusan pemenang: ${error.message}`);
  }
}

// =============================================================================
// 6. NOMINEE ADMIN - Penunjukan Nominee
// =============================================================================

/**
 * Ambil daftar nominee periode beserta status token aksesnya.
 *
 * Karena `nominee_periode` dan `akses_nominee` tidak punya relasi FK
 * langsung, digabung manual berdasarkan pegawai_id/nominee_id.
 *
 * @async
 * @function fetchNomineeByPeriode
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array nominee dengan status akses
 */
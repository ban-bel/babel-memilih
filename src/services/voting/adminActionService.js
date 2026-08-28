import { supabase } from '../../config/supabaseClient';
import { pastikanTokenValid, tandaiTokenTerpakai, UUID_REGEX, getAdminSupabase } from './shared';
import {
  STORAGE_BUCKET_BUKTI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES
} from '../../utils/constants';

export async function resetAksesPenilaiUniversal(periodeId, pegawaiId, adminId, tokenTipe = '', resetNotifikasiWA = false) {
  if (tokenTipe.toLowerCase().includes('nominee')) {
    // 1. Hapus jawaban lama nominee
    const { error: errDel } = await supabase
      .from('jawaban_nominee')
      .delete()
      .eq('periode_id', periodeId)
      .eq('nominee_id', pegawaiId);

    if (errDel) throw new Error(`Gagal menghapus jawaban lama nominee: ${errDel.message}`);

    // 2. Buka kembali akses token
    const updateData = { is_digunakan: false, submitted_at: null };

    // Jika resetNotifikasiWA true, reset juga status WA
    if (resetNotifikasiWA) {
      updateData.notifikasi_wa_sent_at = null;
    }

    const { error: errUpd } = await supabase
      .from('akses_nominee')
      .update(updateData)
      .eq('periode_id', periodeId)
      .eq('nominee_id', pegawaiId);

    if (errUpd) throw new Error(`Gagal mereset akses nominee: ${errUpd.message}`);
    return; // Selesai untuk Nominee
  }

  // Untuk Penilai & Juri (Menggunakan RPC yang sudah menangani Mode 1A, 1B, 2)
  const { error } = await supabase.rpc('reset_akses_penilai_universal', {
    p_periode_id: periodeId,
    p_pegawai_id: pegawaiId,
    p_admin_id: adminId,
  });

  if (error) {
    throw new Error(`Gagal mereset token: ${error.message}`);
  }

  // Reset status WA jika diminta (untuk Penilai/Juri perlu update manual)
  if (resetNotifikasiWA) {
    const tableMap = {
      'penilai': 'akses_penilai',
      'juri': 'juri_periode'
    };

    for (const [tipe, table] of Object.entries(tableMap)) {
      if (tokenTipe.toLowerCase().includes(tipe)) {
        await supabase
          .from(table)
          .update({ notifikasi_wa_sent_at: null })
          .eq('periode_id', periodeId)
          .eq('pegawai_id', pegawaiId);
        break;
      }
    }
  }
}

/**
 * Blok penilai - Hapus jawaban + hapus token permanen.
 *
 * Berbeda dengan reset yang membuka token lagi,
 * blok = token dihapus, orang tidak bisa voting lagi.
 *
 * @async
 * @function blockPenilai
 * @param {number} periodeId - ID periode
 * @param {number} pegawaiId - ID pegawai yang akan diblok
 * @param {string} tokenTipe - Tipe: 'PENILAI', 'JURI', 'NOMINEE'
 * @throws {Error} Jika gagal
 *
 * @example
 * await blockPenilai(1, 5, 'PENILAI');
 * // => Jawaban dihapus, token dihapus, orang tidak bisa voting
 */

export async function blockPenilai(periodeId, pegawaiId, tokenTipe) {
  const tipe = tokenTipe.toLowerCase();

  // Handle Nominee separately
  if (tipe.includes('nominee')) {
    // Hapus jawaban nominee
    const { error: errJawaban } = await supabase
      .from('jawaban_nominee')
      .delete()
      .eq('periode_id', periodeId)
      .eq('nominee_id', pegawaiId);

    if (errJawaban) console.error('Error hapus jawaban nominee:', errJawaban);

    // Hapus token nominee
    const { error } = await supabase
      .from('akses_nominee')
      .delete()
      .eq('periode_id', periodeId)
      .eq('nominee_id', pegawaiId);

    if (error) throw new Error(`Gagal memblok nominee: ${error.message}`);
    return;
  }

  // Handle Penilai (Mode 1A dan 1B)
  if (tipe.includes('penilai')) {
    // Hapus penilaian_skor (Mode 1A)
    const { error: errSkor } = await supabase
      .from('penilaian_skor')
      .delete()
      .eq('periode_id', periodeId)
      .eq('penilai_id', pegawaiId);

    if (errSkor) console.error('Error hapus skor:', errSkor);

    // Hapus suara_quick_vote (Mode 1B)
    const { error: errSuara } = await supabase
      .from('suara_quick_vote')
      .delete()
      .eq('periode_id', periodeId)
      .eq('penilai_id', pegawaiId);

    if (errSuara) console.error('Error hapus suara quick vote:', errSuara);

    // Hapus token penilai
    const { error } = await supabase
      .from('akses_penilai')
      .delete()
      .eq('periode_id', periodeId)
      .eq('pegawai_id', pegawaiId);

    if (error) throw new Error(`Gagal memblok penilai: ${error.message}`);
    return;
  }

  // Handle Juri (Mode 2)
  if (tipe.includes('juri')) {
    // Hapus penilaian_juri
    const { error: errJuri } = await supabase
      .from('penilaian_juri')
      .delete()
      .eq('periode_id', periodeId)
      .eq('juri_id', pegawaiId);

    if (errJuri) console.error('Error hapus penilaian juri:', errJuri);

    // Hapus token juri
    const { error } = await supabase
      .from('juri_periode')
      .delete()
      .eq('periode_id', periodeId)
      .eq('pegawai_id', pegawaiId);

    if (error) throw new Error(`Gagal memblok juri: ${error.message}`);
    return;
  }

  throw new Error(`Tipe tidak valid: ${tokenTipe}`);
}

/**
 * Ambil semua token akses untuk suatu periode (untuk halaman reset token).
 *
 * Menggabungkan data dari:
 * - akses_penilai (token penilai)
 * - akses_nominee (token nominee)
 * - juri_periode (token juri)
 *
 * @async
 * @function fetchSemuaTokenPeriode
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array semua token dengan tipe
 */
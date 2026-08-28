import { supabase } from '../../config/supabaseClient';
import { STORAGE_BUCKET_BUKTI } from '../../utils/constants';

export async function fetchDaftarNominee(periodeId, excludePegawaiId) {
  if (!periodeId || !excludePegawaiId) {
    throw new Error('periodeId dan excludePegawaiId wajib diisi (Anti Self-Vote Engine).');
  }

  const { data, error } = await supabase
    .from('nominee_periode')
    .select(
      `
      id,
      video_profil_link,
      dokumen_link,
      tabel_kehadiran,
      portofolio_pengembangan,
      portofolio_inovasi,
      portofolio_penghargaan,
      nominee:pegawai ( id, nama, nip, nip_baru, foto_url, wilayah_id, wilayah:wilayah_id(nama_wilayah, nama_unit_kerja) )
    `
    )
    .eq('periode_id', periodeId)
    .neq('pegawai_id', excludePegawaiId);

  if (error) {
    throw new Error(`Gagal memuat daftar nominee: ${error.message}`);
  }

  return data.map((item) => {
    const p = item.nominee;
    const unitKerja = p?.wilayah?.nama_unit_kerja || p?.wilayah?.nama_wilayah || '-';
    return p ? { 
      ...p, 
      unit_kerja: unitKerja, 
      wilayah_id: p.wilayah_id, 
      video_profil_link: item.video_profil_link, 
      dokumen_link: item.dokumen_link, 
      tabel_kehadiran: item.tabel_kehadiran,
      portofolio_pengembangan: item.portofolio_pengembangan,
      portofolio_inovasi: item.portofolio_inovasi,
      portofolio_penghargaan: item.portofolio_penghargaan
    } : null;
  }).filter(Boolean);
}

/**
 * Ambil daftar pertanyaan Mode 1A untuk suatu periode.
 * Pertanyaan diurutkan berdasarkan field `urutan`.
 *
 * @async
 * @function fetchPertanyaanMode1A
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array pertanyaan
 *
 * @example
 * const pertanyaan = await fetchPertanyaanMode1A(1);
 * // [{ id, urutan, teks_pertanyaan, skor_min, skor_max }, ...]
 */

export async function fetchPertanyaanMode1A(periodeId) {
  const { data, error } = await supabase
    .from('pertanyaan')
    .select('id, urutan, teks_pertanyaan, skor_min, skor_max')
    .eq('periode_id', periodeId)
    .order('urutan', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat daftar pertanyaan: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Ambil daftar kategori penilaian Mode 2 untuk suatu periode.
 * Include bobot persentase dan range skor.
 *
 * @async
 * @function fetchKategoriPenilaian
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array kategori penilaian
 *
 * @example
 * const kategori = await fetchKategoriPenilaian(1);
 * // [{ id, nama_kategori, deskripsi, bobot_persen, skor_min, skor_max }, ...]
 */

export const fetchPertanyaanPeriode = fetchPertanyaanMode1A;

// =============================================================================
// 5. KETUA JURI - Rekap Real-time & Kunci Pemenang
// =============================================================================

/**
 * Ambil rekap skor Mode 2 real-time per nominee.
 * Data diambil dari `view_tabulasi_mode_2` (weighted score rata-rata).
 *
 * @async
 * @function fetchRekapMode2
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array rekap per nominee
 *
 * @example
 * const rekap = await fetchRekapMode2(1);
 * // [{ nominee_id, nama_nominee, skor_akhir_juri, jumlah_juri_selesai, peringkat }, ...]
 */

export async function fetchNomineeByPeriode(periodeId) {
  const [{ data: nomineeRows, error: e1 }, { data: aksesRows, error: e2 }] = await Promise.all([
    supabase
      .from('nominee_periode')
      .select(`
        id,
        pegawai_id,
        dokumen_link,
        video_profil_link,
        tabel_kehadiran,
        portofolio_pengembangan,
        portofolio_inovasi,
        portofolio_penghargaan,
        pegawai:pegawai_id (
          id,
          nama,
          nip,
          nip_baru,
          foto_url,
          wilayah:wilayah_id ( nama_wilayah, nama_unit_kerja )
        )
      `)
      .eq('periode_id', periodeId),
    supabase.from('akses_nominee').select('nominee_id, is_digunakan, submitted_at, token_akses').eq('periode_id', periodeId),
  ]);

  if (e1) throw new Error(`Gagal memuat daftar nominee: ${e1.message}`);
  if (e2) throw new Error(`Gagal memuat status token nominee: ${e2.message}`);

  const aksesByPegawaiId = new Map((aksesRows ?? []).map((a) => [a.nominee_id, a]));

  return (nomineeRows ?? []).map((n) => {
    const p = n.pegawai;
    const unitKerja = p?.wilayah?.nama_unit_kerja || p?.wilayah?.nama_wilayah || '-';
    return {
      ...n,
      pegawai: p ? { ...p, unit_kerja: unitKerja } : null,
      akses: aksesByPegawaiId.get(n.pegawai_id) ?? null,
    };
  });
}

/**
 * Memperbarui dokumen link dan tabel kehadiran untuk nominee_periode.
 * @async
 * @param {number} nomineePeriodeId - ID dari tabel nominee_periode
 * @param {string} dokumenLink - Tautan Google Drive
 * @param {Object[]} tabelKehadiran - Array object tabel kehadiran
 * @returns {Promise<void>}
 */

export async function updateProfilTambahanNominee(
  nomineePeriodeId,
  dokumenLink,
  tabelKehadiran,
  videoProfilLink = null,
  portofolioPengembangan = null,
  portofolioInovasi = null,
  portofolioPenghargaan = null
) {
  const payload = {
    dokumen_link: dokumenLink || null,
    tabel_kehadiran: tabelKehadiran || [],
  };

  if (videoProfilLink !== null) payload.video_profil_link = videoProfilLink;
  if (portofolioPengembangan !== null) payload.portofolio_pengembangan = portofolioPengembangan;
  if (portofolioInovasi !== null) payload.portofolio_inovasi = portofolioInovasi;
  if (portofolioPenghargaan !== null) payload.portofolio_penghargaan = portofolioPenghargaan;

  const { error } = await supabase
    .from('nominee_periode')
    .update(payload)
    .eq('id', nomineePeriodeId);

  if (error) throw new Error(`Gagal menyimpan profil tambahan: ${error.message}`);
}

/**
 * Tunjuk pegawai sebagai nominee.
 *
 * Membuat 2 baris secara bersamaan:
 * 1. `nominee_periode` - daftar nominee
 * 2. `akses_nominee` - token upload bukti
 *
 * @async
 * @function tambahNominee
 * @param {number} periodeId - ID periode
 * @param {number} pegawaiId - ID pegawai yang ditunjuk
 * @throws {Error} Jika pegawai sudah jadi nominee atau insert error
 */

export async function tambahNominee(periodeId, pegawaiId) {
  const { error: nomineeError } = await supabase
    .from('nominee_periode')
    .insert({ periode_id: periodeId, pegawai_id: pegawaiId });

  if (nomineeError) {
    if (nomineeError.code === '23505') {
      throw new Error('Pegawai ini sudah menjadi nominee pada periode ini.');
    }
    throw new Error(`Gagal menambah nominee: ${nomineeError.message}`);
  }

  const { error: aksesError } = await supabase
    .from('akses_nominee')
    .insert({ periode_id: periodeId, nominee_id: pegawaiId });

  if (aksesError) {
    throw new Error(`Nominee tersimpan, namun gagal membuat token akses: ${aksesError.message}`);
  }

  // Cabut token penilai (jika ada) bila periode ini tidak mengizinkan nominee untuk voting
  const { data: periode } = await supabase
    .from('periode_penilaian')
    .select('is_nominee_can_vote')
    .eq('id', periodeId)
    .single();

  if (periode && periode.is_nominee_can_vote === false) {
    await supabase
      .from('akses_penilai')
      .delete()
      .eq('periode_id', periodeId)
      .eq('pegawai_id', pegawaiId)
      .eq('is_digunakan', false);
  }
}

/**
 * Hapus nominee dari periode.
 *
 * Menghapus 2 baris sekaligus:
 * 1. `nominee_periode`
 * 2. `akses_nominee`
 *
 * @async
 * @function hapusNominee
 * @param {number} periodeId - ID periode
 * @param {number} pegawaiId - ID pegawai nominee
 * @throws {Error} Jika delete error
 */

export async function hapusNominee(periodeId, pegawaiId) {
  // 1. Cek apakah nominee ini punya file_url
  const { data: currentData } = await supabase
    .from('nominee_periode')
    .select('file_url')
    .eq('periode_id', periodeId)
    .eq('pegawai_id', pegawaiId)
    .single();

  const fileUrl = currentData?.file_url;

  // 2. Hapus baris di nominee_periode
  const { error: e1 } = await supabase
    .from('nominee_periode')
    .delete()
    .eq('periode_id', periodeId)
    .eq('pegawai_id', pegawaiId);
  if (e1) throw new Error(`Gagal menghapus nominee: ${e1.message}`);

  // 3. Hapus akses token
  const { error: e2 } = await supabase
    .from('akses_nominee')
    .delete()
    .eq('periode_id', periodeId)
    .eq('nominee_id', pegawaiId);
  if (e2) throw new Error(`Gagal menghapus token akses nominee: ${e2.message}`);

  // 4. Hapus file dari Storage (jika ada)
  if (fileUrl) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET_BUKTI)
      .remove([fileUrl]);
    
    if (storageError) {
      console.error('Gagal menghapus file yatim (orphan file) dari storage:', storageError.message);
      // Tidak perlu throw error karena data utamanya sudah berhasil dihapus
    }
  }

  // 5. Cek pengaturan periode, jika is_nominee_can_vote mati, kembalikan hak pilih pegawai ini
  const { data: periode } = await supabase
    .from('periode_penilaian')
    .select('is_nominee_can_vote')
    .eq('id', periodeId)
    .single();

  if (periode && periode.is_nominee_can_vote === false) {
    // Karena status nominee pegawai ini baru saja dihapus, dia otomatis kembali menjadi pegawai biasa.
    // RPC ini bertugas men-scan seluruh pegawai yang berhak namun belum punya token, dan membuatkan token untuk mereka.
    await supabase.rpc('generate_token_penilaian_multi_unit', {
      p_periode_id: periodeId,
      p_nominee_can_vote: false
    });
  }
}

// =============================================================================
// 7. ADMIN - Reset Token
// =============================================================================

/**
 * Reset token Penilai/Juri.
 *
 * Fungsi atomik di sisi database (RPC SECURITY DEFINER):
 * 1. Hapus skor lama sesuai mode periode
 * 2. Set is_digunakan = false
 * 3. Catat audit log
 *
 * @async
 * @function resetAksesPenilaiUniversal
 * @param {number} periodeId - ID periode
 * @param {number} pegawaiId - ID pegawai yang tokennya direset
 * @param {string} [tokenTipe] - Tipe token (Nominee, Penilai, Juri)
 * @param {boolean} [resetNotifikasiWA] - Jika true, juga reset status notifikasi WA
 * @throws {Error} Jika reset error
 */

export async function fetchVideoProfilNominee(periodeId, nomineeId) {
  const { data, error } = await supabase
    .from('nominee_periode')
    .select('video_profil_link')
    .eq('periode_id', periodeId)
    .eq('pegawai_id', nomineeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Gagal memuat link video profil: ${error.message}`);
  }
  return data?.video_profil_link ?? null;
}

/**
 * Update data portofolio nominee (Pengembangan Diri, Inovasi, Penghargaan).
 * @async
 * @param {string} token 
 * @param {'portofolio_pengembangan' | 'portofolio_inovasi' | 'portofolio_penghargaan'} portofolioType 
 * @param {Object[]} data 
 */

export async function submitPortofolioNominee(token, portofolioType, data) {
  const { data: akses, error: errAkses } = await supabase.rpc('get_akses_nominee_by_token', {
    p_token: token,
  });

  if (errAkses || !akses) {
    throw new Error('Token tidak valid atau sudah kadaluarsa.');
  }

  const updateData = {};
  updateData[portofolioType] = data || [];

  const { error } = await supabase
    .from('nominee_periode')
    .update(updateData)
    .eq('periode_id', akses.periode.id)
    .eq('pegawai_id', akses.nominee.id);

  if (error) {
    throw new Error(`Gagal menyimpan ${portofolioType}: ${error.message}`);
  }
}

/**
 * Fetch data portofolio nominee dari nominee_periode.
 * @async
 * @param {string} token 
 * @returns {Promise<Object>} { portofolio_pengembangan, portofolio_inovasi, portofolio_penghargaan }
 */

export async function fetchPortofolioNominee(token) {
  const { data: akses, error: errAkses } = await supabase.rpc('get_akses_nominee_by_token', {
    p_token: token,
  });

  if (errAkses || !akses) {
    throw new Error('Token tidak valid atau sudah kadaluarsa.');
  }

  const { data, error } = await supabase
    .from('nominee_periode')
    .select('portofolio_pengembangan, portofolio_inovasi, portofolio_penghargaan')
    .eq('periode_id', akses.periode.id)
    .eq('pegawai_id', akses.nominee.id)
    .single();

  if (error) {
    throw new Error(`Gagal memuat portofolio: ${error.message}`);
  }

  const parseIfString = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val || [];
  };

  return {
    portofolio_pengembangan: parseIfString(data?.portofolio_pengembangan),
    portofolio_inovasi: parseIfString(data?.portofolio_inovasi),
    portofolio_penghargaan: parseIfString(data?.portofolio_penghargaan),
  };
}

/**
 * Submit link video profil nominee ke database.
 *
 * @async
 * @function submitVideoProfilNominee
 * @param {string} token - UUID token nominee
 * @param {string} videoLink - Link video profil (YouTube)
 * @throws {Error} Jika gagal
 */

export async function submitVideoProfilNominee(token, videoLink) {
  const { error: rpcError } = await supabase.rpc('submit_video_profil_nominee', {
    p_token: token,
    p_video_link: videoLink,
  });

  if (rpcError) {
    throw new Error(`Gagal menyimpan link video profil: ${rpcError.message}`);
  }
}

/**
 * Menyimpan draft ke server (Cloud Draft)
 * @async
 * @param {string} token 
 * @param {string} mode - "1A", "1C", "2", "2A"
 * @param {Object} data - Objek JSON draft
 */
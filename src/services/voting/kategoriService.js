import { supabase } from '../../config/supabaseClient';

export async function fetchKategoriPenilaian(periodeId) {
  const { data, error } = await supabase
    .from('kategori_penilaian')
    .select('id, nama_kategori, deskripsi, bobot_persen, skor_min, skor_max')
    .eq('periode_id', periodeId)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat kategori penilaian: ${error.message}`);
  }
  return data ?? [];
}

// =============================================================================
// 2B. MODE_2A - SELEKSI & SCORING
// =============================================================================

/**
 * Ambil daftar kriteria Mode 2A untuk suatu periode.
 * MODE_2A: Pilih 1 nominee + beri skor per kriteria.
 *
 * @async
 * @function fetchKriteriaMode2A
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array kriteria
 *
 * @example
 * const kriteria = await fetchKriteriaMode2A(1);
 * // [{ id, nama_kriteria, deskripsi, skor_min, skor_max, urutan }, ...]
 */

export async function fetchVotingKategori(periodeId) {
  const { data, error } = await supabase.rpc('get_voting_kategori_by_periode', {
    p_periode_id: periodeId,
  });

  if (error) {
    throw new Error(`Gagal memuat kategori voting: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Ambil vote yang sudah dilakukan voter (untuk resume/edit).
 *
 * @async
 * @function fetchVotesByVoterToken
 * @param {string} token - UUID token voter
 * @returns {Promise<Object[]>} Array { kategori_id, nominee_id, sudah_vote }
 */

export async function fetchPemenangPerKategori(periodeId) {
  // Ambil data dari table + relasi
  const { data, error } = await supabase
    .from('pemenang_per_kategori')
    .select(`
      id,
      periode_id,
      kategori_id,
      nominee_id,
      suara_total,
      is_auto_locked,
      created_at,
      updated_at
    `)
    .eq('periode_id', periodeId);

  if (error) {
    throw new Error(`Gagal memuat pemenang per kategori: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Ambil detail kategori
  const kategoriIds = data.map((d) => d.kategori_id);
  const { data: kategoriData } = await supabase
    .from('voting_kategori')
    .select('id, nama_kategori, urutan')
    .in('id', kategoriIds);

  // Ambil detail nominee
  const nomineeIds = data.map((d) => d.nominee_id).filter(Boolean);
  const { data: nomineeData } = await supabase
    .from('pegawai')
    .select('id, nama, nip_baru, foto_url')
    .in('id', nomineeIds);

  // Buat map untuk lookup
  const kategoriMap = new Map((kategoriData ?? []).map((k) => [k.id, k]));
  const nomineeMap = new Map((nomineeData ?? []).map((n) => [n.id, n]));

  // Gabungkan data
  return data.map((row) => {
    const kategori = kategoriMap.get(row.kategori_id);
    const nominee = nomineeMap.get(row.nominee_id);

    return {
      kategori_id: row.kategori_id,
      nama_kategori: kategori?.nama_kategori ?? '',
      urutan_kategori: kategori?.urutan ?? 0,
      nominee_id: row.nominee_id,
      nama_nominee: nominee?.nama ?? '',
      nip_baru: nominee?.nip_baru ?? '',
      foto_url: nominee?.foto_url ?? '',
      suara_total: row.suara_total ?? 0,
      is_auto_locked: row.is_auto_locked ?? true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }).sort((a, b) => a.urutan_kategori - b.urutan_kategori);
}

/**
 * Set/UPDATE pemenang per kategori (override oleh Kakan).
 *
 * @async
 * @function setPemenangPerKategori
 * @param {number} periodeId - ID periode
 * @param {number} kategoriId - ID kategori
 * @param {number} nomineeId - ID nominee pemenang
 * @param {string|null} catatan - Catatan override (opsional)
 * @throws {Error} Jika gagal menyimpan
 */

export async function setPemenangPerKategori(periodeId, kategoriId, nomineeId, catatan = null) {
  if (!nomineeId) {
    throw new Error('Nominee pemenang wajib dipilih.');
  }

  // Hitung suara untuk nominee ini di kategori ini
  const { count: suaraTotal } = await supabase
    .from('suara_kategori_vote')
    .select('*', { count: 'exact', head: true })
    .eq('kategori_id', kategoriId)
    .eq('nominee_id', nomineeId);

  const { error } = await supabase
    .from('pemenang_per_kategori')
    .upsert(
      {
        periode_id: periodeId,
        kategori_id: kategoriId,
        nominee_id: nomineeId,
        is_auto_locked: false, // Manual override
        suara_total: suaraTotal ?? 0,
        catatan: catatan,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'periode_id,kategori_id' }
    );

  if (error) {
    throw new Error(`Gagal menyimpan pemenang per kategori: ${error.message}`);
  }
}

/**
 * Generate auto-lock pemenang per kategori dari vote tertinggi.
 * Dipanggil saat periode selesai atau saat admin minta refresh.
 *
 * @async
 * @function autoLockPemenangPerKategori
 * @param {number} periodeId - ID periode
 * @throws {Error} Jika gagal
 */

export async function autoLockPemenangPerKategori(periodeId) {
  const { error } = await supabase.rpc('auto_generate_pemenang_per_kategori', {
    p_periode_id: periodeId,
  });

  if (error) {
    throw new Error(`Gagal auto-lock pemenang: ${error.message}`);
  }
}

/**
 * Reset pemenang per kategori ke auto-lock (dari vote).
 *
 * @async
 * @function resetPemenangPerKategori
 * @param {number} periodeId - ID periode
 * @param {number} kategoriId - ID kategori (null = reset semua)
 * @throws {Error} Jika gagal
 */

export async function resetPemenangPerKategori(periodeId, kategoriId = null) {
  if (kategoriId) {
    // Reset satu kategori
    const { error } = await supabase
      .from('pemenang_per_kategori')
      .delete()
      .eq('periode_id', periodeId)
      .eq('kategori_id', kategoriId);

    if (error) {
      throw new Error(`Gagal reset pemenang kategori: ${error.message}`);
    }
  } else {
    // Reset semua
    const { error } = await supabase
      .from('pemenang_per_kategori')
      .delete()
      .eq('periode_id', periodeId);

    if (error) {
      throw new Error(`Gagal reset semua pemenang: ${error.message}`);
    }
  }

  // Auto-generate ulang
  await autoLockPemenangPerKategori(periodeId);
}

/**
 * Ambil video_profil_link nominee dari nominee_periode.
 *
 * @async
 * @function fetchVideoProfilNominee
 * @param {number} periodeId - ID periode
 * @param {number} nomineeId - ID nominee
 * @returns {Promise<string|null>} Link video atau null
 */
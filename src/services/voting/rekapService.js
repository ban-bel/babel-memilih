import { supabase } from '../../config/supabaseClient';

export async function fetchRekapMode2A(periodeId) {
  const { data, error } = await supabase
    .from('view_tabulasi_mode2a')
    .select('nominee_id, nama_nominee, nip, nip_baru, unit_kerja, foto_url, total_pemilih, rata_rata_skor, skor_terendah, skor_tertinggi, peringkat')
    .eq('periode_id', periodeId)
    .order('peringkat', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat rekap Mode 2A: ${error.message}`);
  }
  return data ?? [];
}

// =============================================================================
// 3. SUBMIT PENILAIAN
// =============================================================================

/**
 * Submit penilaian Mode 1A - Voting Evaluatif.
 * Setiap nominee dinilai untuk setiap pertanyaan dengan skor.
 *
 * @async
 * @function submitPenilaianMode1A
 * @param {string} token - UUID token dari URL
 * @param {number} periodeId - ID periode
 * @param {number} penilaiId - ID pegawai penilai (pemilik token)
 * @param {Object[]} daftarSkor - Array skor per nominee per pertanyaan
 * @param {number} daftarSkor[].nominee_id - ID nominee
 * @param {number} daftarSkor[].pertanyaan_id - ID pertanyaan
 * @param {number} daftarSkor[].skor - Skor yang diberikan
 * @throws {Error} Jika validasi gagal atau submit error
 *
 * @example
 * await submitPenilaianMode1A(token, 1, penilaiId, [
 *   { nominee_id: 5, pertanyaan_id: 1, skor: 85 },
 *   { nominee_id: 5, pertanyaan_id: 2, skor: 90 }
 * ]);
 */

export async function fetchRekapMode2(periodeId) {
  const { data, error } = await supabase
    .from('view_tabulasi_mode_2')
    .select('nominee_id, nama_nominee, nip, nip_baru, unit_kerja, foto_url, skor_akhir_juri, jumlah_juri_selesai, peringkat')
    .eq('periode_id', periodeId)
    .order('peringkat', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat rekap penilaian juri: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Ambil total juri yang ditunjuk pada periode.
 *
 * @async
 * @function fetchJumlahJuriPeriode
 * @param {number} periodeId - ID periode
 * @returns {Promise<number>} Total juri
 */

export async function fetchJumlahJuriPeriode(periodeId) {
  const { data, error } = await supabase.rpc('get_jumlah_juri_periode', { p_periode_id: periodeId });
  if (error) {
    throw new Error(`Gagal memuat jumlah juri: ${error.message}`);
  }
  return data ?? 0;
}


/**
 * Check if all assigned voters/juries have submitted their evaluations.
 */

export async function fetchKelengkapanPenilai(periodeId, mode) {
  const { data, error } = await supabase.rpc('get_kelengkapan_penilai', {
    p_periode_id: periodeId,
    p_mode: mode
  });

  if (error) {
    throw new Error(`Gagal memuat kelengkapan penilai: ${error.message}`);
  }
  
  return data ?? {
    total: 0,
    submitted: 0,
    minRequired: 0,
    isComplete: false
  };
}

/**
 * Ambil rekap Mode 1A (skor rata-rata persentase).
 *
 * @async
 * @function fetchRekapMode1A
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array rekap per nominee
 */

export async function fetchRekapMode1A(periodeId) {
  const { data, error } = await supabase
    .from('view_tabulasi_mode_1a')
    .select('nominee_id, nama_nominee, nip_baru, nip, unit_kerja, foto_url, total_partisipan, skor_akhir_persen, peringkat')
    .eq('periode_id', periodeId)
    .order('peringkat', { ascending: true });

  if (error) throw new Error(`Gagal memuat rekap Mode 1A: ${error.message}`);
  return data ?? [];
}

/**
 * Ambil rekap Mode 1B (total suara).
 *
 * @async
 * @function fetchRekapMode1B
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array rekap per nominee
 */

export async function fetchRekapMode1B(periodeId) {
  const { data, error } = await supabase
    .from('view_tabulasi_mode_1b')
    .select('nominee_id, nama_nominee, nip, nip_baru, unit_kerja, foto_url, total_suara, peringkat')
    .eq('periode_id', periodeId)
    .order('peringkat', { ascending: true });

  if (error) throw new Error(`Gagal memuat rekap Mode 1B: ${error.message}`);
  return data ?? [];
}

/**
 * Ambil catatan kualitatif juri (Mode 2) untuk dibaca Kakan.
 *
 * @async
 * @function fetchCatatanKualitatifJuri
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array catatan per nominee
 */

export async function fetchCatatanKualitatifJuri(periodeId) {
  const { data, error } = await supabase
    .from('penilaian_juri')
    .select(
      `
      nominee_id,
      catatan_juri,
      kategori:kategori_penilaian(nama_kategori),
      juri:pegawai!penilaian_juri_juri_id_fkey(nama)
    `
    )
    .eq('periode_id', periodeId)
    .not('catatan_juri', 'is', null);

  if (error) throw new Error(`Gagal memuat catatan kualitatif juri: ${error.message}`);
  return data ?? [];
}

/**
 * Mengambil rincian penilaian juri per nominee (Mode 2) untuk Dashboard Kakan.
 *
 * @async
 * @function fetchDetailPenilaianJuri
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array detail nilai per juri
 */

export async function fetchDetailPenilaianJuri(periodeId) {
  const { data, error } = await supabase
    .from('penilaian_juri')
    .select(`
      nominee_id,
      kategori_id,
      skor,
      catatan_juri,
      juri_id,
      juri:pegawai!penilaian_juri_juri_id_fkey(nama),
      kategori:kategori_penilaian!penilaian_juri_kategori_id_fkey(nama_kategori, bobot_persen)
    `)
    .eq('periode_id', periodeId);

  if (error) throw new Error(`Gagal memuat rincian penilaian juri: ${error.message}`);
  return data ?? [];
}

/**
 * Ambil status keputusan pemenang saat ini.
 *
 * @async
 * @function fetchKeputusanKakan
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object|null>} Data keputusan atau null
 */

export async function fetchRekapMode1C(periodeId) {
  const { data, error } = await supabase
    .from('view_tabulasi_mode_1c')
    .select(`
      kategori_id,
      nama_kategori,
      kategori_urutan,
      nominee_id,
      nama_nominee,
      nip,
      nip_baru,
      unit_kerja,
      foto_url,
      total_suara,
      peringkat_dalam_kategori
    `)
    .eq('periode_id', periodeId)
    .order('kategori_urutan', { ascending: true })
    .order('peringkat_dalam_kategori', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat rekap Mode 1C: ${error.message}`);
  }

  // Group by kategori
  const byKategori = {};
  const allVotes = [];

  (data ?? []).forEach((row) => {
    if (!byKategori[row.kategori_id]) {
      byKategori[row.kategori_id] = {
        id: row.kategori_id,
        nama_kategori: row.nama_kategori,
        urutan: row.kategori_urutan,
        nominees: [],
      };
    }
    byKategori[row.kategori_id].nominees.push({
      id: row.nominee_id,
      nama: row.nama_nominee,
      nip: row.nip,
      nip_baru: row.nip_baru,
      unit_kerja: row.unit_kerja,
      foto_url: row.foto_url,
      total_suara: row.total_suara,
      peringkat: row.peringkat_dalam_kategori,
    });

    // Track total votes per nominee across all categories
    const existing = allVotes.find((v) => v.nominee_id === row.nominee_id);
    if (existing) {
      existing.total_keseluruhan += row.total_suara;
    } else {
      allVotes.push({
        nominee_id: row.nominee_id,
        nama_nominee: row.nama_nominee,
        nip: row.nip,
        nip_baru: row.nip_baru,
        unit_kerja: row.unit_kerja,
        foto_url: row.foto_url,
        total_keseluruhan: row.total_suara,
      });
    }
  });

  // Calculate overall rank
  allVotes.sort((a, b) => b.total_keseluruhan - a.total_keseluruhan);
  allVotes.forEach((v, i) => {
    v.peringkat_keseluruhan = i + 1;
  });

  return {
    kategori: Object.values(byKategori),
    overview: allVotes,
  };
}

// =============================================================================
// 9. PEMENANG PER KATEGORI (MODE_1B HYBRID)
// =============================================================================

/**
 * Ambil pemenang per kategori untuk periode (MODE_1B Hybrid).
 *
 * @async
 * @function fetchPemenangPerKategori
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array { kategori_id, nama_kategori, nominee_id, nama_nominee, suara_total, is_auto_locked }
 */
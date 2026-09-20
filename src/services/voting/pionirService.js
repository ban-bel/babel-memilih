import { supabase } from '../../config/supabaseClient';

/**
 * Validasi token UUID.
 */
function pastikanTokenValid(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token akses tidak valid atau tidak ditemukan.');
  }
}

/**
 * Mengambil detail akses token Mode PIONIR (Pengusul atau Pemilih Biasa).
 *
 * @param {string} token - UUID token akses
 * @returns {Promise<Object>} Data akses, status fase, periode, dan profil
 */
export async function fetchAksesPionir(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_akses_pionir_by_token', {
    p_token: token,
  });

  if (error) {
    throw new Error(`Gagal memuat akses Pionir: ${error.message}`);
  }

  if (!data || !data.is_valid) {
    throw new Error(data?.error || 'Token tidak valid.');
  }

  return data;
}

/**
 * Mengambil daftar kandidat resmi Mode PIONIR beserta testimoni kata pengusul.
 *
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Array>} Array data kandidat resmi
 */
export async function fetchKandidatPionir(periodeId) {
  if (!periodeId) return [];

  const { data, error } = await supabase.rpc('get_kandidat_pionir_periode', {
    p_periode_id: periodeId,
  });

  if (error) {
    throw new Error(`Gagal memuat kandidat Pionir: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Mengirimkan usulan kandidat beserta nilai kuesioner dan kata kunci oleh Pengusul (Fase 1).
 *
 * @param {string} token - UUID token pengusul
 * @param {number} kandidatId - ID pegawai yang dicalonkan
 * @param {Array<{pertanyaan_id: number, skor: number}>} daftarSkor - Array skor kuesioner
 * @param {string} kataKunci - 1 kata deskripsi untuk calon pionir
 * @returns {Promise<Object>} Hasil submit
 */
export async function submitUsulanPionir(token, kandidatId, daftarSkor, kataKunci) {
  pastikanTokenValid(token);

  if (!kandidatId) {
    throw new Error('Silakan pilih satu rekan kerja untuk dicalonkan sebagai Pionir.');
  }

  if (!Array.isArray(daftarSkor) || daftarSkor.length === 0) {
    throw new Error('Penilaian kriteria kuesioner wajib diisi.');
  }

  if (!kataKunci || !kataKunci.trim()) {
    throw new Error('Mohon berikan 1 kata deskripsi untuk calon pionir.');
  }

  const { data, error } = await supabase.rpc('submit_usulan_pionir', {
    p_token: token,
    p_kandidat_id: kandidatId,
    p_scores_json: daftarSkor,
    p_kata_kunci: kataKunci.trim(),
  });

  if (error) {
    throw new Error(`Gagal mengirimkan usulan: ${error.message}`);
  }

  return data;
}

/**
 * Mengirimkan suara pemilih umum secara rahasia/anonim di Fase 2 (Mode Rahasia LUBER).
 *
 * @param {string} token - UUID token pemilih
 * @param {number} kandidatId - ID kandidat yang dipilih
 * @returns {Promise<Object>} Hasil submit
 */
export async function submitVotePionir(token, kandidatId) {
  pastikanTokenValid(token);

  if (!kandidatId) {
    throw new Error('Silakan pilih salah satu kandidat Pionir.');
  }

  const { data, error } = await supabase.rpc('submit_vote_pionir', {
    p_token: token,
    p_kandidat_id: kandidatId,
  });

  if (error) {
    throw new Error(`Gagal mengirimkan suara: ${error.message}`);
  }

  return data;
}

/**
 * Update nilai CKP (Capaian Kinerja Pegawai) kandidat oleh Admin.
 *
 * @param {number} periodeId - ID periode
 * @param {number} nomineeId - ID pegawai kandidat
 * @param {number} nilaiCkp - Nilai CKP skala 1-100
 * @returns {Promise<void>}
 */
export async function updateCkpKandidatPionir(periodeId, nomineeId, nilaiCkp) {
  if (!periodeId || !nomineeId) {
    throw new Error('Periode ID dan Nominee ID wajib disediakan.');
  }

  const ckp = Number(nilaiCkp);
  if (isNaN(ckp) || ckp < 0 || ckp > 100) {
    throw new Error('Nilai CKP harus berupa angka antara 0 sampai 100.');
  }

  const { error } = await supabase.rpc('update_ckp_kandidat_pionir', {
    p_periode_id: periodeId,
    p_nominee_id: nomineeId,
    p_nilai_ckp: ckp,
  });

  if (error) {
    throw new Error(`Gagal menyimpan nilai CKP: ${error.message}`);
  }
}

/**
 * Mengambil daftar pertanyaan/kriteria kuesioner Mode PIONIR beserta bobotnya.
 *
 * @param {number} periodeId - ID periode
 * @returns {Promise<Array>} Array pertanyaan berbobot
 */
export async function fetchPertanyaanPionir(periodeId) {
  if (!periodeId) return [];

  const { data, error } = await supabase
    .from('pertanyaan')
    .select('id, urutan, teks_pertanyaan, skor_min, skor_max, bobot')
    .eq('periode_id', periodeId)
    .order('urutan', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat pertanyaan Pionir: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Mengambil daftar pegawai yang sah untuk diusulkan oleh Pengusul tertentu.
 * Otomatis mengecualikan:
 * 1. Diri Pengusul sendiri (anti self-nomination)
 * 2. Seluruh pegawai yang bertindak sebagai Pengusul pada periode ini (anti conflict of interest)
 *
 * @param {number} periodeId - ID periode
 * @param {number} pengusulPegawaiId - ID pegawai dari pengusul saat ini
 * @param {string} [kataKunci=''] - Filter pencarian nama
 * @returns {Promise<Array>} Array data pegawai yang dapat dicalonkan
 */
export async function fetchPegawaiEligiblePionir(periodeId, pengusulPegawaiId, kataKunci = '') {
  if (!periodeId) return [];

  // 1. Ambil semua pengusul di periode ini untuk dikecualikan
  const { data: daftarPengusul, error: errPengusul } = await supabase
    .from('pengusul_periode')
    .select('pegawai_id')
    .eq('periode_id', periodeId);

  if (errPengusul) {
    console.warn('Gagal memuat daftar pengusul:', errPengusul.message);
  }

  const excludeIds = new Set((daftarPengusul || []).map((p) => Number(p.pegawai_id)));
  if (pengusulPegawaiId) {
    excludeIds.add(Number(pengusulPegawaiId));
  }

  // 2. Ambil informasi wilayah pengusul agar kandidat dikunci ke kantor yang sama
  let pengusulWilayahId = null;
  if (pengusulPegawaiId) {
    const { data: pengusulData } = await supabase
      .from('pegawai')
      .select('id, wilayah_id')
      .eq('id', pengusulPegawaiId)
      .single();

    if (pengusulData?.wilayah_id) {
      pengusulWilayahId = pengusulData.wilayah_id;
    }
  }

  // 3. Query pegawai aktif
  let query = supabase
    .from('pegawai')
    .select(`
      id, nama, nip, nip_baru, jabatan, foto_url, wilayah_id,
      wilayah:wilayah_id(nama_wilayah, nama_unit_kerja)
    `)
    .eq('is_active', true)
    .neq('role_admin', 'SUPER_ADMIN')
    .order('nama', { ascending: true })
    .limit(300);

  // KUNCI WILAYAH: Hanya rekan kerja dari wilayah/kantor yang sama dengan Pengusul
  if (pengusulWilayahId) {
    query = query.eq('wilayah_id', pengusulWilayahId);
  } else {
    // Fallback ke cakupan wilayah periode jika wilayah pengusul tidak ditemukan
    const { data: periode } = await supabase
      .from('periode_penilaian')
      .select('wilayah_id, cakupan_wilayah:periode_wilayah(wilayah_id)')
      .eq('id', periodeId)
      .single();

    const wilayahIds = [];
    if (periode?.wilayah_id) wilayahIds.push(periode.wilayah_id);
    if (periode?.cakupan_wilayah?.length > 0) {
      periode.cakupan_wilayah.forEach((w) => {
        if (w.wilayah_id) wilayahIds.push(w.wilayah_id);
      });
    }
    if (wilayahIds.length > 0) {
      query = query.in('wilayah_id', wilayahIds);
    }
  }

  if (kataKunci && kataKunci.trim().length >= 2) {
    query = query.ilike('nama', `%${kataKunci.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Gagal memuat daftar pegawai: ${error.message}`);
  }

  return (data ?? [])
    .filter((p) => !excludeIds.has(Number(p.id)))
    .map((p) => ({
      ...p,
      unit_kerja: p.wilayah?.nama_unit_kerja || p.wilayah?.nama_wilayah || '-',
    }));
}


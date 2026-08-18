/**
 * @fileoverview Service layer untuk operasi voting dan penilaian.
 *
 * MODUL INI BERBEDA DENGAN adminService.js:
 * - votingService.js: Beroperasi tanpa login (jalur token publik)
 * - adminService.js: Memerlukan sesi login (otentikasi)
 *
 * ARCHITEKTUR KEAMANAN (v2 - sudah di-hardening):
 *
 * 1. Fetch token & "tandai terpakai" menggunakan RPC SECURITY DEFINER
 *    (bukan query tabel langsung). Ini mencegah enumerasi token karena
 *    policy asli "FOR ALL USING true" membuat tabel token bisa dibaca
 *    lewat anon key publik.
 *
 * 2. Submit tetap 2 langkah dari client:
 *    - Simpan data penilaian
 *    - Tandai token terpakai
 *    Jika langkah kedua gagal, error berbeda dilempar agar UI bisa
 *    mengarahkan pengguna menghubungi Admin.
 *
 * 3. Keterbatasan (belum ditangani):
 *    - penilaian_skor/suara_quick_vote/penilaian_juri masih bisa di-insert
 *      tanpa bukti token asli (risiko integritas, bukan kebocoran data)
 *
 * @module services/votingService
 * @requires supabase - Client Supabase dari config/supabaseClient.js
 */

import { supabase } from '../config/supabaseClient';
import {
  STORAGE_BUCKET_BUKTI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES
} from '../utils/constants';

// =============================================================================
// REGEX VALIDASI TOKEN
// =============================================================================

/** Regex untuk validasi format UUID token. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validasi format token UUID.
 * @param {string} token - Token yang akan divalidasi
 * @throws {Error} Jika format token tidak valid
 */
function pastikanTokenValid(token) {
  if (typeof token !== 'string' || !UUID_REGEX.test(token)) {
    throw new Error('Format token pada link tidak valid.');
  }
}

// =============================================================================
// HELPER INTERNAL
// =============================================================================

/**
 * Tandai token sebagai terpakai lewat RPC berbasis token.
 *
 * INTERNAL USE ONLY - Tidak dimaksudkan dipanggil langsung dari komponen UI,
 * supaya token tidak pernah ditandai "terpakai" tanpa data penilaian yang
 * menyertainya benar-benar tersimpan lebih dulu.
 *
 * @async
 * @param {'tandai_akses_penilai_terpakai'|'tandai_akses_juri_terpakai'|'tandai_akses_nominee_terpakai'} rpcName
 * @param {string} token - Token UUID
 * @throws {Error} Jika gagal update status token
 */
async function tandaiTokenTerpakai(rpcName, token) {
  const { error } = await supabase.rpc(rpcName, { p_token: token });

  if (error) {
    throw new Error(
      'Data penilaian berhasil tersimpan, namun status token gagal diperbarui. ' +
        'Mohon segera hubungi Admin agar tidak terjadi kesalahan submit ganda. ' +
        `Detail teknis: ${error.message}`
    );
  }
}

// =============================================================================
// 1. FETCHING DATA TOKEN (3 Jalur Link Unik)
// =============================================================================

/**
 * Ambil & validasi token Penilai Massal.
 * Dipakai di halaman `/penilai?token=xxx` untuk Mode 1A/1B.
 *
 * @async
 * @function fetchTokenPenilai
 * @param {string} token - UUID token dari query string URL
 * @returns {Promise<Object>} Data token berisi periode, penilai, dan status
 *
 * @example
 * const data = await fetchTokenPenilai('abc123...');
 * // { id, token_akses, is_digunakan, periode: {...}, penilai: {...} }
 */
export async function fetchTokenPenilai(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_akses_penilai_by_token', { p_token: token });

  if (error || !data) {
    throw new Error('Token tidak ditemukan atau tidak valid.');
  }
  return data;
}

/**
 * Ambil & validasi token Dewan Juri.
 * Dipakai di halaman `/juri?token=xxx` untuk Mode 2.
 *
 * @async
 * @function fetchTokenJuri
 * @param {string} token - UUID token dari query string URL
 * @returns {Promise<Object>} Data token berisi periode, juri, dan flag is_ketua_juri
 *
 * @example
 * const data = await fetchTokenJuri('abc123...');
 * // { id, token_akses, is_digunakan, is_ketua_juri: true, periode: {...}, juri: {...} }
 */
export async function fetchTokenJuri(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_akses_juri_by_token', { p_token: token });

  if (error || !data) {
    throw new Error('Token juri tidak ditemukan atau tidak valid.');
  }

  // Tambahkan is_can_vote_own_region dan wilayah_id
  if (data.periode?.id && data.juri?.id) {
    const [jpRes, pgRes] = await Promise.all([
      supabase.from('juri_periode').select('is_can_vote_own_region').eq('periode_id', data.periode.id).eq('pegawai_id', data.juri.id).single(),
      supabase.from('pegawai').select('wilayah_id').eq('id', data.juri.id).single()
    ]);
      
    if (jpRes.data) {
      data.is_can_vote_own_region = jpRes.data.is_can_vote_own_region;
    }
    if (pgRes.data) {
      data.juri.wilayah_id = pgRes.data.wilayah_id;
    }
  }

  return data;
}

/**
 * Ambil & validasi token Nominee.
 * Dipakai di halaman `/nominee?token=xxx`.
 *
 * @async
 * @function fetchTokenNominee
 * @param {string} token - UUID token dari query string URL
 * @returns {Promise<Object>} Data token berisi periode dan nominee
 *
 * @example
 * const data = await fetchTokenNominee('abc123...');
 * // { id, token_akses, is_digunakan, periode: {...}, nominee: {...} }
 */
export async function fetchTokenNominee(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_akses_nominee_by_token', { p_token: token });

  if (error || !data) {
    throw new Error('Token nominee tidak ditemukan atau tidak valid.');
  }
  return data;
}

// =============================================================================
// 1B. VERIFIKASI IDENTITAS (NIP + HP)
// =============================================================================

/**
 * Verifikasi identitas berdasarkan 5 digit NIP terakhir dan 5 digit HP terakhir.
 * Mengembalikan daftar periode yang bisa diakses user.
 *
 * @async
 * @function verifikasiIdentitasPenilai
 * @param {string} nip5digit - 5 digit terakhir NIP lama
 * @param {string} hp5digit - 5 digit terakhir nomor HP
 * @returns {Promise<Object>} Data berisi info pegawai dan daftar periode
 * @throws {Error} Jika verifikasi gagal (data tidak cocok, tidak ada akses, dll)
 *
 * @example
 * const data = await verifikasiIdentitasPenilai('00001', '81234');
 * // {
 * //   pegawai: { id: 1, nama: 'Budi Santoso' },
 * //   periode_list: [
 * //     { token: 'uuid...', periode_id: 1, nama_periode: '...', mode_penilaian: 'MODE_1A', status_akses: 'BELUM_DIGUNAKAN', ... },
 * //     { token: 'uuid...', periode_id: 2, nama_periode: '...', mode_penilaian: 'MODE_1B', status_akses: 'SUDAH_DIGUNAKAN', ... }
 * //   ]
 * // }
 */
export async function verifikasiIdentitasPenilai(nip5digit, hp5digit) {
  // Validasi input
  if (!nip5digit || !nip5digit.match(/^\d{5}$/)) {
    throw new Error('5 digit NIP harus diisi dengan angka (contoh: 00001)');
  }

  if (!hp5digit || !hp5digit.match(/^\d{5}$/)) {
    throw new Error('5 digit HP harus diisi dengan angka (contoh: 81234)');
  }

  const { data, error } = await supabase.rpc('verifikasi_identitas_penilai', {
    p_nip: nip5digit.trim(),
    p_hp: hp5digit.trim()
  });

  if (error) {
    // Parse error message dari PostgreSQL
    const msg = error.message || '';
    if (msg.includes('tidak ditemukan') || msg.includes('tidak cocok')) {
      throw new Error('NIP atau nomor HP tidak cocok dengan data kami.');
    }
    if (msg.includes('tidak ada periode')) {
      throw new Error('Tidak ada periode penilaian aktif untuk Anda saat ini.');
    }
    if (msg.includes('duplikat')) {
      throw new Error('Ditemukan data duplikat. Silakan hubungi admin.');
    }
    throw new Error(`Verifikasi gagal: ${error.message}`);
  }

  if (!data || !data.pegawai) {
    throw new Error('Verifikasi berhasil tetapi data tidak valid. Hubungi admin.');
  }

  // Cek apakah ada periode yang bisa diakses
  const periodeList = data.periode_list || [];
  if (periodeList.length === 0) {
    throw new Error('Tidak ada periode penilaian aktif untuk Anda saat ini.');
  }

  return data;
}

// =============================================================================
// 2. DATA REFERENSI (Untuk Render Form)
// =============================================================================

/**
 * Ambil daftar nominee pada suatu periode dengan ANTI SELF-VOTE FILTER.
 *
 * MENSYARATKAN excludePegawaiId untuk mencegah penilai/juri melihat
 * namanya sendiri dalam daftar nominee (dicegah di level query, bukan UI).
 *
 * @async
 * @function fetchDaftarNominee
 * @param {number} periodeId - ID periode penilaian
 * @param {number} excludePegawaiId - ID pegawai yang akan dikecualikan (pemilik token)
 * @returns {Promise<Object[]>} Array data nominee
 * @throws {Error} Jika parameter tidak valid
 *
 * @example
 * const nomineeList = await fetchDaftarNominee(1, currentUserId);
 */
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
      nominee:pegawai ( id, nama, nip, nip_baru, foto_url, wilayah_id, wilayah:wilayah_id(nama_wilayah, nama_unit_kerja) )
    `
    )
    .eq('periode_id', periodeId)
    .neq('pegawai_id', excludePegawaiId);

  if (error) {
    throw new Error(`Gagal memuat daftar nominee: ${error.message}`);
  }

  return (data ?? []).map(item => {
    const p = item.nominee;
    const unitKerja = p?.wilayah?.nama_unit_kerja || p?.wilayah?.nama_wilayah || '-';
    return p ? { ...p, unit_kerja: unitKerja, wilayah_id: p.wilayah_id, video_profil_link: item.video_profil_link, dokumen_link: item.dokumen_link, tabel_kehadiran: item.tabel_kehadiran } : null;
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
export async function fetchKriteriaMode2A(periodeId) {
  const { data, error } = await supabase
    .from('kriteria_mode2a')
    .select('id, nama_kriteria, deskripsi, skor_min, skor_max, urutan')
    .eq('periode_id', periodeId)
    .order('urutan', { ascending: true });

  if (error) {
    throw new Error(`Gagal memuat daftar kriteria: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Ambil vote yang sudah dilakukan voter (untuk resume/edit) - MODE_2A.
 *
 * @async
 * @function fetchPenilaianMode2A
 * @param {string} token - UUID token voter
 * @returns {Promise<Object[]>} Array { nominee_id, skor, nama_nominee }
 */
export async function fetchPenilaianMode2A(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_penilaian_mode2a_by_token', {
    p_token: token,
  });

  if (error) {
    throw new Error(`Gagal memuat penilaian tersimpan: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Submit penilaian Mode 2A - Seleksi & Scoring.
 * Pilih 1 nominee favorit + beri skor untuk setiap kriteria.
 *
 * @async
 * @function submitPenilaianMode2A
 * @param {string} token - UUID token dari URL
 * @param {number} penilaiId - ID pegawai penilai (untuk self-vote check)
 * @param {Object[]} daftarPenilaian - Array [{nominee_id, kriteria_id, skor}]
 * @throws {Error} Jika validasi gagal atau submit error
 *
 * @example
 * await submitPenilaianMode2A(token, penilaiId, [
 *   { nominee_id: 5, kriteria_id: 1, skor: 85 },
 *   { nominee_id: 5, kriteria_id: 2, skor: 90 }
 * ]);
 */
export async function submitPenilaianMode2A(token, penilaiId, daftarPenilaian) {
  pastikanTokenValid(token);

  if (!Array.isArray(daftarPenilaian) || daftarPenilaian.length === 0) {
    throw new Error('Tidak ada penilaian yang dikirim.');
  }

  // Validasi: semua item harus punya nominee_id, kriteria_id, dan skor
  for (const item of daftarPenilaian) {
    if (!item.nominee_id || !item.kriteria_id || item.skor == null) {
      throw new Error('Format penilaian tidak valid. Setiap kriteria harus memiliki skor.');
    }
  }

  // Self-vote check
  if (daftarPenilaian.some((item) => item.nominee_id === penilaiId)) {
    throw new Error('Tidak diperbolehkan menilai diri sendiri (Self-Vote terdeteksi).');
  }

  // Validasi: semua kriteria harus skor
  const uniqueNominees = [...new Set(daftarPenilaian.map((item) => item.nominee_id))];
  if (uniqueNominees.length !== 1) {
    throw new Error('MODE_2A hanya boleh memilih 1 nominee.');
  }

  const payload = daftarPenilaian.map((item) => ({
    nominee_id: item.nominee_id,
    kriteria_id: item.kriteria_id,
    skor: item.skor,
  }));

  const { error } = await supabase.rpc('submit_penilaian_mode2a', {
    p_token: token,
    p_payload: payload,
  });

  if (error) {
    throw new Error(`Gagal menyimpan penilaian: ${error.message}`);
  }
}

/**
 * Ambil rekap Mode 2A (rata-rata skor per nominee).
 *
 * @async
 * @function fetchRekapMode2A
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array rekap per nominee
 */
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
export async function submitPenilaianMode1A(token, periodeId, penilaiId, daftarSkor, daftarNominee) {
  if (!Array.isArray(daftarSkor) || daftarSkor.length === 0) {
    throw new Error('Tidak ada skor yang dikirim.');
  }
  if (daftarSkor.some((item) => item.nominee_id === penilaiId)) {
    throw new Error('Tidak diperbolehkan menilai diri sendiri (Self-Vote terdeteksi).');
  }

  // ============================================================
  // VALIDASI WAJIB DI FRONTEND SEBELUM KIRIM
  // ============================================================
  if (daftarNominee && daftarNominee.length > 0) {
    const nomineeIds = new Set(daftarNominee.map(n => n.id));
    const scoredNomineeIds = new Set(daftarSkor.map(s => s.nominee_id));

    // Cek apakah ada nominee yang belum dinilai
    const belumDinilai = [];
    for (const nomineeId of nomineeIds) {
      if (nomineeId !== penilaiId && !scoredNomineeIds.has(nomineeId)) {
        const nominee = daftarNominee.find(n => n.id === nomineeId);
        if (nominee) belumDinilai.push(nominee.nama);
      }
    }

    if (belumDinilai.length > 0) {
      throw new Error(
        `Wajib menilai SEMUA nominee! Yang belum dinilai: ${belumDinilai.join(', ')}`
      );
    }
  }

  // Validasi setiap nominee harus punya skor untuk SEMUA pertanyaan
  if (daftarNominee && daftarSkor.length > 0) {
    // Group skor by nominee_id
    const skorByNominee = {};
    daftarSkor.forEach(s => {
      if (!skorByNominee[s.nominee_id]) skorByNominee[s.nominee_id] = [];
      skorByNominee[s.nominee_id].push(s.pertanyaan_id);
    });

    // Hitung jumlah pertanyaan unik
    const pertanyaanIds = new Set(daftarSkor.map(s => s.pertanyaan_id));

    for (const [nomineeId, pertanyaanIdsSet] of Object.entries(skorByNominee)) {
      if (pertanyaanIdsSet.length < pertanyaanIds.size) {
        throw new Error('Wajib mengisi SEMUA skor untuk setiap nominee!');
      }
    }
  }

  const payload = daftarSkor.map((item) => ({
    nominee_id: item.nominee_id,
    pertanyaan_id: item.pertanyaan_id,
    skor: item.skor,
  }));

  const { error } = await supabase.rpc('submit_penilaian_mode_1a', {
    p_token: token,
    p_payload_json: payload,
  });

  if (error) {
    // Tangani error validasi mandatory dari server
    if (error.message.includes('Wajib menilai SEMUA nominee') ||
        error.message.includes('Wajib mengisi SEMUA skor')) {
      throw new Error(error.message);
    }
    throw new Error(`Gagal menyimpan skor penilaian: ${error.message}`);
  }
}

/**
 * Submit voting Mode 1B - Quick Vote / Pegawai Terfavorit.
 * Hanya pilih 1 nominee favorit.
 *
 * @async
 * @function submitQuickVoteMode1B
 * @param {string} token - UUID token dari URL
 * @param {number} periodeId - ID periode
 * @param {number} penilaiId - ID pegawai penilai (pemilik token)
 * @param {number} nomineePilihanId - ID nominee yang dipilih
 * @throws {Error} Jika validasi gagal atau submit error
 *
 * @example
 * await submitQuickVoteMode1B(token, 1, penilaiId, 5);
 */
export async function submitQuickVoteMode1B(token, periodeId, penilaiId, nomineePilihanId) {
  if (nomineePilihanId === undefined) {
    throw new Error('Silakan pilih satu nominee atau abstain terlebih dahulu.');
  }
  if (nomineePilihanId === penilaiId) {
    throw new Error('Tidak diperbolehkan memilih diri sendiri (Self-Vote terdeteksi).');
  }

  const { error } = await supabase.rpc('submit_quick_vote_mode_1b', {
    p_token: token,
    p_nominee_id: nomineePilihanId === 'abstain' ? null : nomineePilihanId,
  });

  if (error) {
    throw new Error(`Gagal menyimpan suara: ${error.message}`);
  }
}

/**
 * Submit penilaian Mode 2 - Panel Dewan Juri.
 * Juri menilai setiap nominee untuk setiap kategori dengan skor berbobot.
 *
 * @async
 * @function submitPenilaianMode2
 * @param {string} token - UUID token juri dari URL
 * @param {number} periodeId - ID periode
 * @param {number} juriId - ID pegawai juri
 * @param {Object[]} daftarPenilaian - Array penilaian per nominee per kategori
 * @param {number} daftarPenilaian[].nominee_id - ID nominee
 * @param {number} daftarPenilaian[].kategori_id - ID kategori
 * @param {number} daftarPenilaian[].skor - Skor yang diberikan
 * @param {string|null} [daftarPenilaian[].catatan_juri] - Catatan opsional
 * @throws {Error} Jika validasi gagal atau submit error
 *
 * @example
 * await submitPenilaianMode2(token, 1, juriId, [
 *   { nominee_id: 5, kategori_id: 1, skor: 85, catatan_juri: 'Inovatif' },
 *   { nominee_id: 5, kategori_id: 2, skor: 90 }
 * ]);
 */
export async function submitPenilaianMode2(token, periodeId, juriId, daftarPenilaian) {
  if (!Array.isArray(daftarPenilaian) || daftarPenilaian.length === 0) {
    throw new Error('Tidak ada penilaian yang dikirim.');
  }
  if (daftarPenilaian.some((item) => item.nominee_id === juriId)) {
    throw new Error('Tidak diperbolehkan menilai diri sendiri (Self-Vote terdeteksi).');
  }

  const payload = daftarPenilaian.map((item) => ({
    nominee_id: item.nominee_id,
    kategori_id: item.kategori_id,
    skor: item.skor,
    catatan_juri: item.catatan_juri ?? null,
  }));

  const { error } = await supabase.rpc('submit_penilaian_mode_2', {
    p_token: token,
    p_payload_json: payload,
  });

  if (error) {
    throw new Error(`Gagal menyimpan penilaian juri: ${error.message}`);
  }
}

// =============================================================================
// 4. NOMINEE - Narasi & Upload Bukti
// =============================================================================

/**
 * Simpan/perbarui narasi jawaban nominee untuk satu pertanyaan.
 *
 * @async
 * @function submitJawabanNominee
 * @param {string} token - UUID token nominee dari URL
 * @param {number} pertanyaanId - ID pertanyaan
 * @param {string|null} teksJawaban - Isi jawaban narasi
 * @throws {Error} Jika token tidak valid atau save error
 *
 * @example
 * await submitJawabanNominee(token, 1, 'Inovasi saya adalah...');
 */
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
export async function uploadBuktiPDF(token, periodeId, nomineeId, pertanyaanId, file) {
  pastikanTokenValid(token);

  if (!file) {
    throw new Error('File belum dipilih.');
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File harus berformat PDF, Word (doc/docx), Excel (xls/xlsx), atau PowerPoint (ppt/pptx).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file melebihi batas maksimal 10MB.');
  }

  // Path: {periodeId}/{nomineeId}/{pertanyaanId}-{timestamp}.{ext}
  const fileExt = file.name.split('.').pop() || 'pdf';
  const path = `${periodeId}/${nomineeId}/${pertanyaanId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error(`Gagal mengunggah file PDF: ${uploadError.message}`);
  }

  const { error: rpcError } = await supabase.rpc('submit_jawaban_nominee', {
    p_token: token,
    p_pertanyaan_id: pertanyaanId,
    p_teks_jawaban: null,
    p_file_url: path,
  });

  if (rpcError) {
    throw new Error(
      `File berhasil diunggah, namun gagal menyimpan link ke database: ${rpcError.message}`
    );
  }

  return path;
}

/**
 * Upload dokumen bukti Mode 2 (satu file per nominee).
 *
 * Berbeda dari uploadBuktiPDF yang menyimpan ke jawaban_nominee (per pertanyaan),
 * fungsi ini menyimpan ke nominee_periode.file_url (satu file per nominee).
 *
 * FILE VALIDATION:
 * - Tipe: PDF, Word, Excel, PowerPoint
 * - Ukuran: Maksimal 10MB
 *
 * @async
 * @function submitBuktiNomineeMode2
 * @param {string} token - UUID token nominee dari URL
 * @param {File} file - Objek File dari input[type=file]
 * @returns {Promise<string>} Path file di storage
 * @throws {Error} Jika validasi gagal atau upload error
 *
 * @example
 * const path = await submitBuktiNomineeMode2(token, fileInput.files[0]);
 */
export async function submitBuktiNomineeMode2(token, file) {
  pastikanTokenValid(token);

  if (!file) {
    throw new Error('File belum dipilih.');
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File harus berformat PDF, Word (doc/docx), Excel (xls/xlsx), atau PowerPoint (ppt/pptx).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file melebihi batas maksimal 10MB.');
  }

  // Path: {timestamp}-{filename}
  const fileExt = file.name.split('.').pop() || 'pdf';
  const fileName = `${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .upload(fileName, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error(`Gagal mengunggah file: ${uploadError.message}`);
  }

  // Simpan path ke nominee_periode.file_url via RPC
  const { error: rpcError } = await supabase.rpc('submit_bukti_nominee_mode2', {
    p_token: token,
    p_file_url: fileName,
  });

  if (rpcError) {
    throw new Error(`File berhasil diunggah, namun gagal menyimpan ke database: ${rpcError.message}`);
  }

  return fileName;
}

/**
 * Ambil file_url bukti nominee Mode 2 dari nominee_periode.
 *
 * @async
 * @function fetchBuktiNomineeMode2
 * @param {number} periodeId - ID periode
 * @param {number} nomineeId - ID nominee
 * @returns {Promise<string|null>} Path file atau null
 */
export async function fetchBuktiNomineeMode2(periodeId, nomineeId) {
  const { data, error } = await supabase
    .from('nominee_periode')
    .select('file_url')
    .eq('periode_id', periodeId)
    .eq('pegawai_id', nomineeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Gagal memuat bukti nominee: ${error.message}`);
  }
  return data?.file_url ?? null;
}

/**
 * Buat signed URL sementara untuk mengakses file bukti Mode 2.
 *
 * @async
 * @function getSignedUrlBuktiMode2
 * @param {string} fileName - Nama file di storage
 * @param {number} [expiresInSeconds=3600] - Masa berlaku URL (default 1 jam)
 * @returns {Promise<string>} Signed URL untuk download
 * @throws {Error} Jika gagal generate signed URL
 */
export async function getSignedUrlBuktiMode2(fileName, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .createSignedUrl(fileName, expiresInSeconds);

  if (error) {
    throw new Error(`Gagal membuat link akses file: ${error.message}`);
  }
  return data.signedUrl;
}

/**
 * Buat signed URL sementara untuk mengakses file bukti.
 *
 * @async
 * @function getSignedUrlBuktiPDF
 * @param {string} path - Path file di storage
 * @param {number} [expiresInSeconds=3600] - Masa berlaku URL (default 1 jam)
 * @returns {Promise<string>} Signed URL untuk download
 * @throws {Error} Jika gagal generate signed URL
 *
 * @example
 * const url = await getSignedUrlBuktiPDF('1/5/1-123456789.pdf');
 * // => 'https://xxx.supabase.co/storage/v1/object/sign/...?token=...'
 */
export async function getSignedUrlBuktiPDF(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`Gagal membuat link akses file: ${error.message}`);
  }
  return data.signedUrl;
}

/**
 * Tandai token Nominee sebagai selesai/terpakai.
 *
 * PANGGIL HANYA SAAT nominee menekan tombol "Selesai & Kirim",
 * BUKAN otomatis di setiap submit jawaban/upload file.
 *
 * @async
 * @function selesaikanPengisianNominee
 * @param {string} token - UUID token nominee
 * @throws {Error} Jika gagal tandai token
 */
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
    .select('nominee_id, pertanyaan_id, teks_jawaban, file_url, updated_at')
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
 * Ambil status keputusan pemenang saat ini.
 *
 * @async
 * @function fetchKeputusanKakan
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object|null>} Data keputusan atau null
 */
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
export async function fetchNomineeByPeriode(periodeId) {
  const [{ data: nomineeRows, error: e1 }, { data: aksesRows, error: e2 }] = await Promise.all([
    supabase
      .from('nominee_periode')
      .select(`
        id,
        pegawai_id,
        dokumen_link,
        tabel_kehadiran,
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
export async function updateProfilTambahanNominee(nomineePeriodeId, dokumenLink, tabelKehadiran) {
  const { error } = await supabase
    .from('nominee_periode')
    .update({ dokumen_link: dokumenLink || null, tabel_kehadiran: tabelKehadiran || [] })
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
export async function fetchSemuaTokenPeriode(periodeId) {
  const [penilaiResult, nomineeResult, juriResult] = await Promise.all([
    supabase
      .from('akses_penilai')
      .select(`
        id,
        token_akses,
        is_digunakan,
        submitted_at,
        pegawai:pegawai_id ( id, nama, nip, nip_baru, foto_url, unit_kerja:wilayah_id(nama_unit_kerja) )
      `)
      .eq('periode_id', periodeId),
    supabase
      .from('akses_nominee')
      .select(`
        id,
        token_akses,
        is_digunakan,
        submitted_at,
        nominee:pegawai!akses_nominee_nominee_id_fkey ( id, nama, nip, nip_baru, foto_url, unit_kerja:wilayah_id(nama_unit_kerja) )
      `)
      .eq('periode_id', periodeId),
    supabase
      .from('juri_periode')
      .select(`
        id,
        token_akses,
        is_digunakan,
        submitted_at,
        is_ketua_juri,
        pegawai:pegawai_id ( id, nama, nip, nip_baru, foto_url, unit_kerja:wilayah_id(nama_unit_kerja) )
      `)
      .eq('periode_id', periodeId),
  ]);

  const tokens = [];

  // Format penilai
  if (!penilaiResult.error) {
    (penilaiResult.data ?? []).forEach((item) => {
      const p = item.pegawai;
      tokens.push({
        id: item.id,
        pegawai_id: p?.id,
        token: item.token_akses,
        tipe: 'Penilai',
        is_digunakan: item.is_digunakan,
        submitted_at: item.submitted_at,
        nama: p?.nama,
        nip: p?.nip,
        nip_baru: p?.nip_baru,
        unit_kerja: p?.unit_kerja?.nama_unit_kerja,
        foto_url: p?.foto_url,
      });
    });
  }

  // Format nominee
  if (!nomineeResult.error) {
    (nomineeResult.data ?? []).forEach((item) => {
      const p = item.nominee;
      tokens.push({
        id: item.id,
        pegawai_id: p?.id,
        token: item.token_akses,
        tipe: 'Nominee',
        is_digunakan: item.is_digunakan,
        submitted_at: item.submitted_at,
        nama: p?.nama,
        nip: p?.nip,
        nip_baru: p?.nip_baru,
        unit_kerja: p?.unit_kerja?.nama_unit_kerja,
        foto_url: p?.foto_url,
      });
    });
  }

  // Format juri
  if (!juriResult.error) {
    (juriResult.data ?? []).forEach((item) => {
      const p = item.pegawai;
      tokens.push({
        id: item.id,
        pegawai_id: p?.id,
        token: item.token_akses,
        tipe: 'Juri' + (item.is_ketua_juri ? ' (Ketua)' : ''),
        is_digunakan: item.is_digunakan,
        submitted_at: item.submitted_at,
        nama: p?.nama,
        nip: p?.nip,
        nip_baru: p?.nip_baru,
        unit_kerja: p?.unit_kerja?.nama_unit_kerja,
        foto_url: p?.foto_url,
      });
    });
  }

  return tokens;
}

// =============================================================================
// 8. MODE_1B HYBRID - VOTING (FLAT ATAU PER KATEGORI)
// =============================================================================

/**
 * Ambil daftar kategori voting untuk MODE_1B (jika diaktifkan).
 *
 * @async
 * @function fetchVotingKategori
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array kategori voting
 *
 * @example
 * const kategori = await fetchVotingKategori(1);
 * // [{ id: 1, nama_kategori: 'Pegawai Terlucu', deskripsi: '...', urutan: 1 }, ...]
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
export async function fetchVotesByVoterToken(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_votes_by_voter_token', {
    p_token: token,
  });

  if (error) {
    throw new Error(`Gagal memuat status vote: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Submit vote untuk satu kategori (MODE_1B Hybrid).
 * Bisa dipanggil berulang untuk update/revote.
 *
 * @async
 * @function submitVoteMode1C
 * @param {string} token - UUID token voter
 * @param {number} kategoriId - ID kategori
 * @param {number} nomineeId - ID nominee yang dipilih
 * @throws {Error} Jika validasi gagal
 */
export async function submitVoteMode1C(token, kategoriId, nomineeId) {
  pastikanTokenValid(token);

  if (!kategoriId) {
    throw new Error('Kategori belum dipilih.');
  }
  if (!nomineeId) {
    throw new Error('Nominee belum dipilih.');
  }

  const { error } = await supabase.rpc('submit_vote_mode_1c', {
    p_token: token,
    p_kategori_id: kategoriId,
    p_nominee_id: nomineeId,
  });

  if (error) {
    throw new Error(`Gagal menyimpan vote: ${error.message}`);
  }
}

/**
 * Submit semua vote sekaligus (MODE_1B Hybrid).
 * WAJIB vote semua kategori.
 *
 * @async
 * @function submitAllVotesMode1C
 * @param {string} token - UUID token voter
 * @param {Object[]} votes - Array { kategori_id, nominee_id }
 * @throws {Error} Jika validasi gagal atau tidak lengkap
 *
 * @example
 * await submitAllVotesMode1C(token, [
 *   { kategori_id: 1, nominee_id: 5 },
 *   { kategori_id: 2, nominee_id: 8 },
 *   { kategori_id: 3, nominee_id: 3 }
 * ]);
 */
export async function submitAllVotesMode1C(token, votes) {
  pastikanTokenValid(token);

  if (!Array.isArray(votes) || votes.length === 0) {
    throw new Error('Tidak ada vote yang dikirim.');
  }

  // Validasi: tidak boleh vote diri sendiri
  for (const vote of votes) {
    if (vote.nominee_id === undefined) {
      throw new Error('Semua kategori harus memiliki nominee yang dipilih atau abstain.');
    }
  }

  // Ambil info voter untuk validasi self-vote
  const tokenData = await fetchTokenPenilai(token);
  const voterId = tokenData.penilai?.id;

  for (const vote of votes) {
    if (vote.nominee_id === voterId) {
      throw new Error('Tidak diperbolehkan memilih diri sendiri.');
    }
  }

  const payload = votes.map((v) => ({
    kategori_id: v.kategori_id,
    nominee_id: v.nominee_id === 'abstain' ? null : v.nominee_id,
  }));

  const { error } = await supabase.rpc('submit_votes_mode_1c', {
    p_token: token,
    p_votes: payload,
  });

  if (error) {
    throw new Error(`Gagal menyimpan suara: ${error.message}`);
  }
}

/**
 * Ambil rekap hasil voting MODE_1B (Hybrid).
 * Hasil per kategori dengan ranking.
 *
 * @async
 * @function fetchRekapMode1C
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object>} { kategori: [...], overview: [...] }
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
 * Submit link video profil nominee ke database.
 *
 * @async
 * @function submitVideoProfilNominee
 * @param {string} token - UUID token nominee
 * @param {string} videoLink - Link video profil (YouTube)
 * @throws {Error} Jika gagal
 */
export async function submitVideoProfilNominee(token, videoLink) {
  pastikanTokenValid(token);
  const { error: rpcError } = await supabase.rpc('submit_video_profil_nominee', {
    p_token: token,
    p_video_link: videoLink,
  });

  if (rpcError) {
    throw new Error(`Gagal menyimpan link video profil: ${rpcError.message}`);
  }
}

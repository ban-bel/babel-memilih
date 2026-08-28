import { supabase } from '../../config/supabaseClient';
import { fetchTokenPenilai } from './authService';

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

export async function submitPenilaianMode1A(token, _periodeId, penilaiId, daftarSkor, daftarNominee) {
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

export async function submitQuickVoteMode1B(token, _periodeId, penilaiId, nomineePilihanId) {
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

export async function submitPenilaianMode2(token, _periodeId, juriId, daftarPenilaian) {
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
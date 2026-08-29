import { supabase } from '../../config/supabaseClient';
import { pastikanTokenValid, UUID_REGEX } from './shared';

export async function fetchTokenPenilai(token) {
  pastikanTokenValid(token);

  const { data, error } = await supabase.rpc('get_akses_penilai_by_token', { p_token: token });

  if (error || !data) {
    throw new Error('Token tidak ditemukan atau tidak valid.');
  }

  // SUPPLEMENTARY FETCH FOR MISSING COLUMNS
  if (data?.periode?.id) {
    const { data: periodeInfo } = await supabase
      .from('periode_penilaian')
      .select('is_video_profil, is_tabel_kehadiran, is_portofolio_pengembangan, is_portofolio_inovasi, is_portofolio_penghargaan')
      .eq('id', data.periode.id)
      .single();
      
    if (periodeInfo) {
      return {
        ...data,
        periode: {
          ...data.periode,
          ...periodeInfo
        }
      };
    }
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

    // SUPPLEMENTARY FETCH FOR MISSING PERIODE COLUMNS
  if (data?.periode?.id) {
    const { data: periodeInfo } = await supabase
      .from('periode_penilaian')
      .select('is_video_profil, is_tabel_kehadiran, is_portofolio_pengembangan, is_portofolio_inovasi, is_portofolio_penghargaan')
      .eq('id', data.periode.id)
      .single();
      
    if (periodeInfo) {
      return {
        ...data,
        periode: {
          ...data.periode,
          ...periodeInfo
        }
      };
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

  // SUPPLEMENTARY FETCH FOR MISSING COLUMNS
  if (data?.periode?.id) {
    const { data: periodeInfo } = await supabase
      .from('periode_penilaian')
      .select('is_video_profil, is_tabel_kehadiran, is_portofolio_pengembangan, is_portofolio_inovasi, is_portofolio_penghargaan')
      .eq('id', data.periode.id)
      .single();
      
    if (periodeInfo) {
      return {
        ...data,
        periode: {
          ...data.periode,
          ...periodeInfo
        }
      };
    }
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
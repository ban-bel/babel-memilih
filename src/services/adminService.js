/**
 * @fileoverview Service layer untuk operasi Admin Sistem Penilaian Pegawai.
 *
 * MODUL INI HANYA BISA DIAKSES OLEH PENGGUNA YANG SUDAH LOGIN (Supabase Auth)
 * dengan role_admin <> 'USER_BIASA'. Semua operasi dilindungi oleh Row Level
 * Security (RLS) yang didefinisikan di supabase/step4_admin_rls.sql.
 *
 * BERBEDA DENGAN votingService.js:
 * - adminService.js: Memerlukan sesi login (otentikasi)
 * - votingService.js: Beroperasi tanpa login (jalur token publik)
 *
 * @module services/adminService
 * @requires supabase - Client Supabase dari config/supabaseClient.js
 */

import { supabase } from '../config/supabaseClient';

// =============================================================================
// AUTENTIKASI ADMIN
// =============================================================================

/**
 * Ambil profil admin yang sedang login.
 * Menggabungkan data dari auth.users (otentikasi) dengan tabel pegawai (data).
 *
 * @async
 * @function fetchSesiAdmin
 * @returns {Promise<Object|null>} Objek profil pegawai atau null jika belum login
 * @returns {number} return.id - ID pegawai di database
 * @returns {string} return.nama - Nama lengkap admin
 * @returns {string} return.role_admin - Role admin (SUPER_ADMIN, ADMIN_PROVINSI, ADMIN_KABKOTA)
 * @returns {number} return.wilayah_id - ID wilayah tempat admin bertugas
 * @returns {boolean} return.is_kakan - Apakah admin adalah Kepala Kantor
 *
 * @example
 * const admin = await fetchSesiAdmin();
 * if (admin) {
 *   console.log(`Login sebagai ${admin.nama} (${admin.role_admin})`);
 * }
 */
export async function fetchSesiAdmin() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data, error } = await supabase
    .from('pegawai')
    .select('id, nama, nip, foto_url, role_admin, wilayah_id, is_kakan')
    .eq('user_id', session.user.id)
    .single();

  if (error) throw new Error('Profil pegawai untuk akun ini tidak ditemukan.');
  return data;
}

/**
 * Proses login admin menggunakan email dan password.
 * Memanggil Supabase Auth signInWithPassword.
 *
 * @async
 * @function loginAdmin
 * @param {string} email - Alamat email admin yang terdaftar
 * @param {string} password - Password akun admin
 * @returns {Promise<void>} Tidak mengembalikan nilai (throw error jika gagal)
 * @throws {Error} Jika kredensial salah atau akun tidak ditemukan
 *
 * @example
 * try {
 *   await loginAdmin('admin@example.com', 'password123');
 *   console.log('Login berhasil');
 * } catch (err) {
 *   console.error('Login gagal:', err.message);
 * }
 */
export async function loginAdmin(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('Login gagal: ' + error.message);
}

/**
 * Proses logout admin dari sesi saat ini.
 * Menghapus sesi autentikasi dari Supabase.
 *
 * @async
 * @function logoutAdmin
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await logoutAdmin();
 * console.log('Sesi berakhir');
 */
export async function logoutAdmin() {
  await supabase.auth.signOut();
}

/**
 * Mencari UID Auth berdasarkan email.
 * Fungsi ini memanggil RPC 'get_uid_by_email' yang harus dipasang di database.
 * 
 * @async
 * @function cariUidByEmail
 * @param {string} email - Email pegawai yang akan dicari
 * @returns {Promise<string|null>} UID (UUID) jika ketemu, atau null jika tidak
 */
export async function cariUidByEmail(email) {
  if (!email) return null;
  
  const { data, error } = await supabase.rpc('get_uid_by_email', { p_email: email });
  
  if (error) {
    console.warn("Gagal memanggil RPC get_uid_by_email:", error.message);
    return null;
  }
  
  return data;
}

// =============================================================================
// MANAJEMEN WILAYAH
// =============================================================================

/**
 * Ambil daftar lengkap wilayah (provinsi dan kabkota).
 * Dipakai sebagai selector di halaman periode, pegawai, dan lainnya.
 *
 * @async
 * @function fetchWilayahList
 * @returns {Promise<Object[]>} Array daftar wilayah terurut
 * @returns {number} [].id - ID wilayah
 * @returns {string} [].kode_wilayah - Kode wilayah (opsional)
 * @returns {string} [].nama_wilayah - Nama wilayah
 * @returns {string} [].nama_unit_kerja - Nama unit kerja (untuk kabkota)
 * @returns {string} [].level - Level wilayah (PROVINSI atau KABKOTA)
 * @returns {number|null} [].parent_id - ID parent wilayah (null untuk provinsi)
 *
 * @example
 * const wilayah = await fetchWilayahList();
 * // Output: [{ id: 1, nama_wilayah: 'Jawa Barat', level: 'PROVINSI' }, ...]
 */
export async function fetchWilayahList() {
  const { data, error } = await supabase
    .from('wilayah')
    .select('id, kode_wilayah, nama_wilayah, nama_unit_kerja, level, parent_id')
    .order('level', { ascending: true })
    .order('nama_wilayah', { ascending: true });

  if (error) throw new Error(`Gagal memuat daftar wilayah: ${error.message}`);
  return data ?? [];
}

/**
 * Tambah wilayah atau unit kerja baru ke sistem.
 *
 * @async
 * @function tambahWilayah
 * @param {string|null} kodeWilayah - Kode wilayah (misal: '32' untuk Jawa Barat)
 * @param {string} namaWilayah - Nama wilayah/unit kerja
 * @param {string} level - Level: 'PROVINSI' atau 'KABKOTA'
 * @param {number|null} [parentId=null] - ID provinsi parent (wajib untuk KABKOTA)
 * @param {string|null} [namaUnitKerja=null] - Nama unit kerja (opsional)
 * @returns {Promise<Object>} Data wilayah yang baru dibuat
 *
 * @example
 * // Tambah provinsi baru
 * await tambahWilayah('99', 'Kalimantan Utara', 'PROVINSI');
 *
 * @example
 * // Tambah kabkota baru (parent: provinsi Sulawesi Selatan id=73)
 * await tambahWilayah('73.01', 'Toraja', 'KABKOTA', 73, 'Kantor Toraja');
 */
export async function tambahWilayah(kodeWilayah, namaWilayah, level, parentId = null, namaUnitKerja = null) {
  const { data, error } = await supabase
    .from('wilayah')
    .insert({
      kode_wilayah: kodeWilayah || null,
      nama_wilayah: namaWilayah,
      nama_unit_kerja: namaUnitKerja || null,
      level: level,
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Gagal menambah wilayah: ${error.message}`);
  return data;
}

/**
 * Update data wilayah yang sudah ada.
 *
 * @async
 * @function updateWilayah
 * @param {number} wilayahId - ID wilayah yang akan diupdate
 * @param {Object} wilayahData - Data fields yang akan diupdate
 * @param {string} [wilayahData.nama_wilayah] - Nama wilayah baru
 * @param {string} [wilayahData.nama_unit_kerja] - Nama unit kerja baru
 * @param {string} [wilayahData.kode_wilayah] - Kode wilayah baru
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await updateWilayah(1, { nama_wilayah: 'Jawa Barat (Revisi)' });
 */
export async function updateWilayah(wilayahId, wilayahData) {
  const { error } = await supabase.from('wilayah').update(wilayahData).eq('id', wilayahId);
  if (error) throw new Error(`Gagal memperbarui wilayah: ${error.message}`);
}

/**
 * Hapus wilayah dari sistem.
 * CATATAN: Penghapusan akan cascade ke pegawai dan periode terkait.
 *
 * @async
 * @function hapusWilayah
 * @param {number} wilayahId - ID wilayah yang akan dihapus
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await hapusWilayah(5);
 */
export async function hapusWilayah(wilayahId) {
  const { error } = await supabase.from('wilayah').delete().eq('id', wilayahId);
  if (error) throw new Error(`Gagal menghapus wilayah: ${error.message}`);
}

// =============================================================================
// MANAJEMEN PEGAWAI
// =============================================================================

/**
 * Tambah pegawai baru ke master data pegawai.
 *
 * @async
 * @function tambahPegawai
 * @param {Object} pegawaiData - Data pegawai baru
 * @param {string} pegawaiData.nama - Nama lengkap pegawai
 * @param {string} [pegawaiData.nip] - NIP lama (opsional)
 * @param {string} [pegawaiData.nip_baru] - NIP baru 15 digit
 * @param {string} [pegawaiData.email] - Email pegawai
 * @param {string} [pegawaiData.no_hp] - Nomor HP
 * @param {number} pegawaiData.wilayah_id - ID wilayah penempatan
 * @param {string} [pegawaiData.golongan] - Golongan/ruang
 * @param {string} [pegawaiData.jabatan] - Jabatan
 * @returns {Promise<Object>} Data pegawai yang baru dibuat
 *
 * @example
 * const newPegawai = await tambahPegawai({
 *   nama: 'John Doe',
 *   nip_baru: '198501152020121001',
 *   email: 'john.doe@email.com',
 *   wilayah_id: 1,
 *   jabatan: 'Fungsional Umum'
 * });
 */
export async function tambahPegawai(pegawaiData) {
  const { data, error } = await supabase.from('pegawai').insert([pegawaiData]).select().single();
  if (error) throw new Error(`Gagal menambah pegawai: ${error.message}`);
  return data;
}

/**
 * Import massal pegawai dari array JSON (hasil parsing CSV/Excel).
 *
 * @async
 * @function tambahPegawaiBulk
 * @param {Object[]} daftarPegawai - Array data pegawai
 * @param {string} [].nama - Nama lengkap
 * @param {string} [].nip - NIP lama
 * @param {string} [].nip_baru - NIP baru
 * @param {string} [].email - Email
 * @param {string} [].no_hp - HP
 * @param {number} [].wilayah_id - ID Wilayah
 * @returns {Promise<Object[]>} Array data pegawai yang berhasil diimport
 *
 * @example
 * const dataExcel = [
 *   { nama: 'Ahmad', nip_baru: '19880101...', wilayah_id: 1 },
 *   { nama: 'Budi', nip_baru: '19900101...', wilayah_id: 1 }
 * ];
 * await tambahPegawaiBulk(dataExcel);
 */
export async function tambahPegawaiBulk(daftarPegawai) {
  const { data, error } = await supabase.from('pegawai').insert(daftarPegawai).select();
  if (error) throw new Error(`Gagal mengimpor data pegawai: ${error.message}`);
  return data;
}

/**
 * Update data pegawai yang sudah ada.
 *
 * @async
 * @function updatePegawai
 * @param {number} pegawaiId - ID pegawai yang akan diupdate
 * @param {Object} pegawaiData - Data fields yang akan diupdate
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await updatePegawai(5, { jabatan: 'Ahli Muda', golongan: 'III/c' });
 */
export async function updatePegawai(pegawaiId, pegawaiData) {
  const { error } = await supabase.from('pegawai').update(pegawaiData).eq('id', pegawaiId);
  if (error) throw new Error(`Gagal memperbarui pegawai: ${error.message}`);
}

/**
 * Hapus pegawai dari master data.
 *
 * @async
 * @function hapusPegawai
 * @param {number} pegawaiId - ID pegawai yang akan dihapus
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await hapusPegawai(10);
 */
export async function hapusPegawai(pegawaiId) {
  const { error } = await supabase.from('pegawai').delete().eq('id', pegawaiId);
  if (error) throw new Error(`Gagal menghapus pegawai: ${error.message}`);
}

/**
 * Cari daftar pegawai aktif dengan filter wilayah dan kata kunci.
 * Dipakai untuk memilih juri di Mode 2.
 *
 * @async
 * @function fetchDaftarPegawaiAktif
 * @param {number|null} [wilayahId=null] - Filter berdasarkan wilayah (null = semua)
 * @param {string} [kata_kunci=''] - Filter nama (case-insensitive)
 * @returns {Promise<Object[]>} Array pegawai dengan field tambahan unit_kerja
 *
 * @example
 * // Cari semua pegawai
 * const semua = await fetchDaftarPegawaiAktif();
 *
 * @example
 * // Cari di wilayah tertentu
 * const jogja = await fetchDaftarPegawaiAktif(5);
 *
 * @example
 * // Cari dengan filter nama
 * const cari = await fetchDaftarPegawaiAktif(null, 'Ahmad');
 */
export async function fetchDaftarPegawaiAktif(wilayahId, kata_kunci = '', includeInactive = false, excludeSuperAdmin = true) {
  let query = supabase
    .from('pegawai')
    .select(`
      id, nama, nip, nip_baru, email, no_hp, golongan, jabatan, foto_url, wilayah_id, role_admin, is_kakan, is_active,
      wilayah:wilayah_id ( nama_wilayah, nama_unit_kerja )
    `)
    .order('nama', { ascending: true })
    .limit(1000);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (excludeSuperAdmin) {
    query = query.neq('role_admin', 'SUPER_ADMIN');
  }

  if (wilayahId) query = query.eq('wilayah_id', wilayahId);
  if (kata_kunci) query = query.ilike('nama', `%${kata_kunci}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal mencari pegawai: ${error.message}`);

  return (data ?? []).map((p) => ({
    ...p,
    unit_kerja: p.wilayah?.nama_unit_kerja || p.wilayah?.nama_wilayah || '-',
  }));
}

// =============================================================================
// MANAJEMEN PERIODE PENILAIAN
// =============================================================================

/**
 * Ambil daftar periode penilaian.
 * Dipakai di halaman KelolaPeriode, KelolaNominee, DashboardKakan, ResetToken.
 *
 * @async
 * @function fetchPeriodeList
 * @returns {Promise<Object[]>} Array periode penilaian terurut terbaru
 *
 * @example
 * const periodeList = await fetchPeriodeList();
 * // [{ id: 1, nama_periode: '2026 Ganjil', status: 'DRAFT', ... }]
 */
export async function fetchPeriodeList(wilayahId = null) {
  let query = supabase
    .from('periode_penilaian')
    .select(`
      id,
      nama_periode,
      petunjuk_penilaian,
      mode_penilaian,
      status,
      jumlah_kandidat_kakan,
      max_nominee,
      wilayah_id,
      tgl_mulai,
      tgl_selesai,
      is_nominee_can_vote,
      is_allow_abstain,
      is_video_profil,
      is_video_profil_dinilai,
      is_tabel_kehadiran,
      is_portofolio_pengembangan,
      is_portofolio_pengembangan_dinilai,
      is_portofolio_inovasi,
      is_portofolio_inovasi_dinilai,
      is_portofolio_penghargaan,
      is_portofolio_penghargaan_dinilai,
      wilayah:wilayah_id ( nama_wilayah )
    `);

  if (wilayahId) {
    query = query.eq('wilayah_id', wilayahId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`Gagal memuat daftar periode: ${error.message}`);
  return data ?? [];
}

/**
 * Buat periode penilaian baru dengan status DRAFT.
 *
 * @async
 * @function buatPeriodePenilaian
 * @param {Object} periode - Data periode baru
 * @param {number} periode.wilayah_id - ID wilayah periode
 * @param {string} periode.nama_periode - Nama/judul periode
 * @param {string} periode.mode_penilaian - Mode: 'MODE_1A', 'MODE_1B', atau 'MODE_2'
 * @param {string} [periode.tgl_mulai] - Tanggal mulai (ISO string)
 * @param {string} [periode.tgl_selesai] - Tanggal selesai (ISO string)
 * @param {string} [periode.petunjuk_penilaian] - Petunjuk/instruksi untuk peserta
 * @param {number} [periode.jumlah_kandidat_kakan] - Jumlah kandidat pilihan Kakan (default: 3)
 * @param {number} [periode.created_by] - ID admin yang membuat
 * @returns {Promise<number>} ID periode yang baru dibuat
 *
 * @example
 * const periodeId = await buatPeriodePenilaian({
 *   wilayah_id: 1,
 *   nama_periode: 'Penilaian Semester 1 2026',
 *   mode_penilaian: 'MODE_1A',
 *   tgl_mulai: '2026-07-01',
 *   tgl_selesai: '2026-07-31'
 * });
 */
export async function buatPeriodePenilaian(periode) {
  // Ensure proper timestamp format: append seconds if missing, add timezone
  const formatTimestamp = (val) => {
    if (!val) return null;
    // val is like "2026-08-18T10:00". Parse it as local time, then convert to ISO UTC.
    return new Date(val).toISOString();
  };

  const { data, error } = await supabase
    .from('periode_penilaian')
    .insert({
      wilayah_id: periode.wilayah_id,
      nama_periode: periode.nama_periode,
      petunjuk_penilaian: periode.petunjuk_penilaian || null,
      mode_penilaian: periode.mode_penilaian,
      jumlah_kandidat_kakan: periode.jumlah_kandidat_kakan ?? 3,
      max_nominee: periode.max_nominee ?? 10,
      tgl_mulai: formatTimestamp(periode.tgl_mulai),
      tgl_selesai: formatTimestamp(periode.tgl_selesai),
      status: 'DRAFT',
      created_by: periode.created_by,
      is_video_profil: periode.is_video_profil || false,
      is_video_profil_dinilai: periode.is_video_profil_dinilai || false,
      is_nominee_can_vote: periode.is_nominee_can_vote ?? false,
      is_allow_abstain: periode.is_allow_abstain ?? false,
      is_tabel_kehadiran: periode.is_tabel_kehadiran ?? false,
      is_portofolio_pengembangan: periode.is_portofolio_pengembangan ?? false,
      is_portofolio_pengembangan_dinilai: periode.is_portofolio_pengembangan_dinilai ?? false,
      is_portofolio_inovasi: periode.is_portofolio_inovasi ?? false,
      is_portofolio_inovasi_dinilai: periode.is_portofolio_inovasi_dinilai ?? false,
      is_portofolio_penghargaan: periode.is_portofolio_penghargaan ?? false,
      is_portofolio_penghargaan_dinilai: periode.is_portofolio_penghargaan_dinilai ?? false,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Gagal membuat periode: ${error.message}`);
  return data.id;
}

/**
 * Ubah status periode penilaian.
 * Alur status: DRAFT -> BERJALAN -> SELESAI -> DIARSIPKAN
 *
 * @async
 * @function updateStatusPeriode
 * @param {number} periodeId - ID periode yang akan diubah
 * @param {string} statusBaru - Status baru: 'DRAFT', 'BERJALAN', 'SELESAI', 'DIARSIPKAN'
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * // Aktifkan periode
 * await updateStatusPeriode(1, 'BERJALAN');
 *
 * @example
 * // Tutup periode
 * await updateStatusPeriode(1, 'SELESAI');
 */
export async function updateStatusPeriode(periodeId, statusBaru) {
  const { error } = await supabase
    .from('periode_penilaian')
    .update({ status: statusBaru })
    .eq('id', periodeId);

  if (error) throw new Error(`Gagal mengubah status periode: ${error.message}`);
}

/**
 * Update data detail periode penilaian (selain status).
 *
 * @async
 * @function updatePeriodePenilaian
 * @param {number} periodeId - ID periode yang akan diupdate
 * @param {Object} payload - Data fields yang akan diupdate
 * @param {string} [payload.nama_periode] - Nama baru
 * @param {string} [payload.petunjuk_penilaian] - Petunjuk baru
 * @param {string} [payload.tgl_mulai] - Tanggal mulai baru
 * @param {string} [payload.tgl_selesai] - Tanggal selesai baru
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await updatePeriodePenilaian(1, {
 *   nama_periode: 'Penilaian Semester 1 2026 (Revisi)',
 *   tgl_selesai: '2026-08-15'
 * });
 */
export async function updatePeriodePenilaian(periodeId, payload) {
  const updatedPayload = { ...payload };
  if (updatedPayload.tgl_mulai) {
    updatedPayload.tgl_mulai = new Date(updatedPayload.tgl_mulai).toISOString();
  }
  if (updatedPayload.tgl_selesai) {
    updatedPayload.tgl_selesai = new Date(updatedPayload.tgl_selesai).toISOString();
  }

  const { error } = await supabase
    .from('periode_penilaian')
    .update(updatedPayload)
    .eq('id', periodeId);

  if (error) throw new Error(`Gagal memperbarui periode: ${error.message}`);

  // Cabut token penilai milik nominee jika hak pilih mereka dinonaktifkan
  if (payload.is_nominee_can_vote === false) {
    const { data: nominees } = await supabase
      .from('nominee_periode')
      .select('pegawai_id')
      .eq('periode_id', periodeId);

    if (nominees && nominees.length > 0) {
      const nomineeIds = nominees.map(n => n.pegawai_id);
      
      // Hanya hapus token yang belum digunakan
      await supabase
        .from('akses_penilai')
        .delete()
        .eq('periode_id', periodeId)
        .eq('is_digunakan', false)
        .in('pegawai_id', nomineeIds);
    }
  } else if (payload.is_nominee_can_vote === true) {
    // Jika diaktifkan kembali, otomatis generate token (hanya men-generate bagi yang belum punya token)
    const { data: periode } = await supabase
      .from('periode_penilaian')
      .select('wilayah_id')
      .eq('id', periodeId)
      .single();
      
    if (periode && periode.wilayah_id) {
      await supabase.rpc('generate_token_penilaian_multi_unit', {
        p_periode_id: periodeId,
        p_wilayah_ids: [periode.wilayah_id]
      });
    }
  }
}

/**
 * Hapus periode penilaian beserta seluruh data terkait.
 * Penghapusan cascade: pertanyaan, kategori, nominee_periode, akses_*, penilaian_*
 *
 * @async
 * @function hapusPeriodePenilaian
 * @param {number} periodeId - ID periode yang akan dihapus
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await hapusPeriodePenilaian(5);
 */
export async function hapusPeriodePenilaian(periodeId) {
  const { error } = await supabase
    .from('periode_penilaian')
    .delete()
    .eq('id', periodeId);

  if (error) throw new Error(`Gagal menghapus periode: ${error.message}`);
}

// =============================================================================
// KONFIGURASI PENILAIAN
// =============================================================================

/**
 * Simpan daftar pertanyaan untuk Mode 1A.
 * Pertanyaan ini akan ditampilkan ke nominee untuk dijawab secara narasi.
 *
 * @async
 * @function simpanPertanyaanMode1A
 * @param {number} periodeId - ID periode
 * @param {Object[]} daftarPertanyaan - Array pertanyaan
 * @param {string} [].teks_pertanyaan - Isi pertanyaan
 * @param {number} [].skor_min - Skor minimum jawaban
 * @param {number} [].skor_max - Skor maksimum jawaban
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await simpanPertanyaanMode1A(1, [
 *   { teks_pertanyaan: 'Jelaskan inovasi Anda', skor_min: 0, skor_max: 100 },
 *   { teks_pertanyaan: 'Dampak inovasi terhadap layanan', skor_min: 0, skor_max: 100 }
 * ]);
 */
export async function simpanPertanyaanMode1A(periodeId, daftarPertanyaan) {
  const payload = daftarPertanyaan.map((p, idx) => ({
    periode_id: periodeId,
    urutan: idx + 1,
    teks_pertanyaan: p.teks_pertanyaan,
    skor_min: p.skor_min,
    skor_max: p.skor_max,
  }));

  const { error } = await supabase.from('pertanyaan').insert(payload);
  if (error) throw new Error(`Gagal menyimpan pertanyaan: ${error.message}`);
}

/**
 * Simpan daftar kategori penilaian untuk Mode 2.
 * Total bobot semua kategori HARUS sama dengan 100%.
 * Validasi dilakukan di dua level: UI (FormKategoriBuilder) dan Server (RPC).
 *
 * @async
 * @function simpanKategoriMode2
 * @param {number} periodeId - ID periode
 * @param {Object[]} daftarKategori - Array kategori
 * @param {string} [].nama_kategori - Nama kategori
 * @param {string} [].deskripsi - Deskripsi kategori (opsional)
 * @param {number} [].bobot_persen - Bobot kategori dalam persen (0-100)
 * @param {number} [].skor_min - Skor minimum
 * @param {number} [].skor_max - Skor maksimum
 * @returns {Promise<void>} Tidak mengembalikan nilai
 * @throws {Error} Jika total bobot bukan 100%
 *
 * @example
 * await simpanKategoriMode2(1, [
 *   { nama_kategori: 'Inovasi', deskripsi: 'Tingkat kebaruan', bobot_persen: 40, skor_min: 0, skor_max: 100 },
 *   { nama_kategori: 'Implementasi', deskripsi: 'Kemudahan diterapkan', bobot_persen: 35, skor_min: 0, skor_max: 100 },
 *   { nama_kategori: 'Dampak', deskripsi: 'Dampak terhadap layanan', bobot_persen: 25, skor_min: 0, skor_max: 100 }
 * ]);
 */
export async function simpanKategoriMode2(periodeId, daftarKategori) {
  // Hapus kategori lama terlebih dahulu
  await supabase.from('kategori_penilaian').delete().eq('periode_id', periodeId);

  if (!daftarKategori || daftarKategori.length === 0) return;

  const payload = daftarKategori.map((k) => ({
    periode_id: periodeId,
    nama_kategori: k.nama_kategori,
    deskripsi: k.deskripsi || null,
    bobot_persen: k.bobot_persen,
    skor_min: k.skor_min,
    skor_max: k.skor_max,
  }));

  const { error: insertError } = await supabase.from('kategori_penilaian').insert(payload);
  if (insertError) throw new Error(`Gagal menyimpan kategori penilaian: ${insertError.message}`);

  const { error: rpcError } = await supabase.rpc('check_total_bobot_kategori', { p_periode_id: periodeId });
  if (rpcError) {
    throw new Error(`Validasi total bobot kategori gagal: ${rpcError.message}`);
  }
}

// =============================================================================
// MANAJEMEN KRITERIA MODE_2A (SELEKSI & SCORING)
// =============================================================================

/**
 * Simpan daftar kriteria untuk Mode 2A.
 * MODE_2A: Pilih 1 nominee + beri skor per kriteria (tanpa bobot).
 *
 * @async
 * @function simpanKriteriaMode2A
 * @param {number} periodeId - ID periode
 * @param {Object[]} daftarKriteria - Array kriteria
 * @param {string} [].nama_kriteria - Nama kriteria
 * @param {string} [].deskripsi - Deskripsi kriteria (opsional)
 * @param {number} [].skor_min - Skor minimum (default 1)
 * @param {number} [].skor_max - Skor maksimum (default 100)
 * @returns {Promise<void>}
 * @throws {Error} Jika gagal menyimpan
 *
 * @example
 * await simpanKriteriaMode2A(1, [
 *   { nama_kriteria: 'Inovasi', deskripsi: 'Tingkat kebaruan', skor_min: 1, skor_max: 100 },
 *   { nama_kriteria: 'Dampak', deskripsi: 'Dampak terhadap layanan', skor_min: 1, skor_max: 100 }
 * ]);
 */
export async function simpanKriteriaMode2A(periodeId, daftarKriteria) {
  // Delete existing criteria first
  await supabase.from('kriteria_mode2a').delete().eq('periode_id', periodeId);

  if (!daftarKriteria || daftarKriteria.length === 0) {
    return; // No criteria to save
  }

  const payload = daftarKriteria.map((k, idx) => ({
    periode_id: periodeId,
    nama_kriteria: k.nama_kriteria,
    deskripsi: k.deskripsi || null,
    skor_min: k.skor_min || 1,
    skor_max: k.skor_max || 100,
    urutan: idx + 1,
  }));

  const { error } = await supabase.from('kriteria_mode2a').insert(payload);
  if (error) {
    throw new Error(`Gagal menyimpan kriteria: ${error.message}`);
  }
}

/**
 * Ambil daftar kriteria Mode 2A untuk suatu periode.
 *
 * @async
 * @function fetchKriteriaMode2AByPeriode
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array kriteria
 */
export async function fetchKriteriaMode2AByPeriode(periodeId) {
  const { data, error } = await supabase
    .from('kriteria_mode2a')
    .select('id, nama_kriteria, deskripsi, skor_min, skor_max, urutan')
    .eq('periode_id', periodeId)
    .order('urutan', { ascending: true });

  if (error) {
    throw new Error(`Gagal mengambil kriteria: ${error.message}`);
  }
  return data ?? [];
}

/**
 * Tunjuk juri untuk periode Mode 2.
 * Token UUID untuk setiap juri dibuat otomatis oleh database (uuid_generate_v4).
 *
 * @async
 * @function tugaskanJuriMode2
 * @param {number} periodeId - ID periode
 * @param {Object[]} daftarJuri - Array data juri
 * @param {number} [].pegawai_id - ID pegawai yang ditunjuk sebagai juri
 * @param {boolean} [].is_ketua_juri - Apakah担任 ketua juri
 * @returns {Promise<void>} Tidak mengembalikan nilai
 *
 * @example
 * await tugaskanJuriMode2(1, [
 *   { pegawai_id: 5, is_ketua_juri: true },
 *   { pegawai_id: 8, is_ketua_juri: false },
 *   { pegawai_id: 12, is_ketua_juri: false }
 * ]);
 */
export async function tugaskanJuriMode2(periodeId, daftarJuri) {
  const payload = daftarJuri.map((j) => ({
    periode_id: periodeId,
    pegawai_id: j.pegawai_id,
    is_ketua_juri: Boolean(j.is_ketua_juri),
    is_can_vote_own_region: j.is_can_vote_own_region ?? true,
  }));

  const { error } = await supabase.from('juri_periode').insert(payload);
  if (error) throw new Error(`Gagal menunjuk juri: ${error.message}`);
}

// =============================================================================
// MANAJEMEN KATEGORI VOTING (MODE_1B HYBRID)
// =============================================================================

/**
 * Simpan daftar kategori voting untuk MODE_1B (Hybrid).
 * Aktif ketika periode MODE_1B memiliki setidaknya 1 kategori.
 *
 * @async
 * @function simpanVotingKategori
 * @param {number} periodeId - ID periode
 * @param {Object[]} daftarKategori - Array kategori
 * @param {string} [].nama_kategori - Nama kategori
 * @param {string} [].deskripsi - Deskripsi (opsional)
 * @returns {Promise<void>}
 *
 * @example
 * await simpanVotingKategori(1, [
 *   { nama_kategori: 'Pegawai Terlucu', deskripsi: 'Paling menghibur' },
 *   { nama_kategori: 'Paling Ramah', deskripsi: 'Sikap paling ramah' }
 * ]);
 */
export async function simpanVotingKategori(periodeId, daftarKategori) {
  // Hapus kategori lama jika ada
  const { error: deleteError } = await supabase
    .from('voting_kategori')
    .delete()
    .eq('periode_id', periodeId);

  if (deleteError) {
    throw new Error(`Gagal menghapus kategori lama: ${deleteError.message}`);
  }

  // Insert kategori baru
  if (daftarKategori.length === 0) {
    return; // Tidak ada kategori baru
  }

  const payload = daftarKategori.map((k, idx) => ({
    periode_id: periodeId,
    nama_kategori: k.nama_kategori,
    deskripsi: k.deskripsi || null,
    urutan: idx + 1,
  }));

  const { error: insertError } = await supabase.from('voting_kategori').insert(payload);
  if (insertError) throw new Error(`Gagal menyimpan kategori voting: ${insertError.message}`);
}

/**
 * Ambil daftar kategori voting untuk MODE_1B (Hybrid).
 *
 * @async
 * @function fetchVotingKategoriAdmin
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object[]>} Array kategori voting
 */
export async function fetchVotingKategoriAdmin(periodeId) {
  const { data, error } = await supabase
    .from('voting_kategori')
    .select('id, nama_kategori, deskripsi, urutan')
    .eq('periode_id', periodeId)
    .order('urutan', { ascending: true });

  if (error) throw new Error(`Gagal memuat kategori voting: ${error.message}`);
  return data ?? [];
}

/**
 * Hitung jumlah voter yang sudah vote di semua kategori.
 * Untuk tracking progress MODE_1B (Hybrid).
 *
 * @async
 * @function fetchProgressVotingMode1C
 * @param {number} periodeId - ID periode
 * @returns {Promise<Object>} { total_voter, sudah_vote, belum_vote }
 */
export async function fetchProgressVotingMode1C(periodeId) {
  // Total voter (token yang sudah dibuat)
  const { count: totalToken } = await supabase
    .from('akses_penilai')
    .select('*', { count: 'exact', head: true })
    .eq('periode_id', periodeId);

  // Total voter yang sudah vote di SEMUA kategori
  const { data: votes } = await supabase
    .from('suara_kategori_vote')
    .select('voter_id')
    .eq('periode_id', periodeId);

  // Hitung voter unik yang vote
  const voterIds = new Set((votes ?? []).map((v) => v.voter_id));

  // Total kategori
  const { count: totalKategori } = await supabase
    .from('voting_kategori')
    .select('*', { count: 'exact', head: true })
    .eq('periode_id', periodeId);

  // Voter yang vote di SEMUA kategori
  const voterVoteCount = {};
  (votes ?? []).forEach((v) => {
    voterVoteCount[v.voter_id] = (voterVoteCount[v.voter_id] || 0) + 1;
  });

  const sudahVoteSemua = Object.values(voterVoteCount).filter(
    (count) => count >= totalKategori
  ).length;

  return {
    total_voter: totalToken || 0,
    sudah_vote: sudahVoteSemua,
    belum_vote: (totalToken || 0) - sudahVoteSemua,
    total_kategori: totalKategori || 0,
  };
}

/**
 * Generate token penilaian untuk multi-unit kerja sekaligus.
 * Memanggil RPC generate_token_penilaian_multi_unit dengan array wilayah IDs.
 *
 * @async
 * @function generateTokenPenilaianMultiUnit
 * @param {number} periodeId - ID periode penilaian
 * @param {number[]} wilayahIds - Array ID wilayah yang participate
 * @returns {Promise<number>} Jumlah token yang berhasil dibuat
 *
 * @example
 * // Berikan token voting ke unit A dan B
 * const jumlah = await generateTokenPenilaianMultiUnit(1, [1, 2]);
 * console.log(`Dibuat ${jumlah} token`);
 */
export async function generateTokenPenilaianMultiUnit(periodeId, wilayahIds) {
  if (!Array.isArray(wilayahIds) || wilayahIds.length === 0) {
    throw new Error('Daftar wilayah wajib diisi.');
  }

  const { data, error } = await supabase.rpc('generate_token_penilaian_multi_unit', {
    p_periode_id: periodeId,
    p_wilayah_ids: wilayahIds,
  });

  if (error) throw new Error(`Gagal membuat token massal: ${error.message}`);
  return data;
}

/**
 * Generate token penilaian massal (legacy - single wilayah).
 * Alias untuk backward compatibility.
 *
 * @async
 * @function generateTokenPenilaianMassal
 * @param {number} periodeId - ID periode penilaian
 * @param {number} wilayahId - ID wilayah target
 * @returns {Promise<number>} Jumlah token yang berhasil dibuat
 */
export async function generateTokenPenilaianMassal(periodeId, wilayahId) {
  return generateTokenPenilaianMultiUnit(periodeId, [wilayahId]);
}

/**
 * Simpan daftar unit kerja yang participate dalam periode.
 *
 * @async
 * @function simpanUnitKerjaPeriode
 * @param {number} periodeId - ID periode penilaian
 * @param {number[]} wilayahIds - Array ID wilayah
 * @returns {Promise<void>}
 */
export async function simpanUnitKerjaPeriode(periodeId, wilayahIds) {
  if (!Array.isArray(wilayahIds) || wilayahIds.length === 0) {
    throw new Error('Daftar wilayah wajib diisi.');
  }

  const payload = wilayahIds.map((wid) => ({
    periode_id: periodeId,
    wilayah_id: wid,
  }));

  const { error } = await supabase.from('periode_unit_kerja').insert(payload);
  if (error) throw new Error(`Gagal menyimpan unit kerja periode: ${error.message}`);
}

/**
 * Ambil daftar unit kerja yang participate dalam periode.
 *
 * @async
 * @function fetchUnitKerjaPeriode
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array unit kerja
 */
export async function fetchUnitKerjaPeriode(periodeId) {
  const { data, error } = await supabase
    .from('periode_unit_kerja')
    .select(`
      id,
      wilayah_id,
      wilayah:wilayah_id(id, kode_wilayah, nama_wilayah, nama_unit_kerja, level)
    `)
    .eq('periode_id', periodeId);

  if (error) throw new Error(`Gagal memuat unit kerja periode: ${error.message}`);
  return data ?? [];
}

/**
 * Cari daftar pegawai aktif dari multiple unit kerja.
 *
 * @async
 * @function fetchDaftarPegawaiAktifMultiUnit
 * @param {number[]} wilayahIds - Array ID wilayah
 * @param {string} [kata_kunci=''] - Filter nama
 * @returns {Promise<Object[]>} Array pegawai
 */
export async function fetchDaftarPegawaiAktifMultiUnit(wilayahIds, kata_kunci = '') {
  let query = supabase
    .from('pegawai')
    .select(`
      id, nama, nip, nip_baru, email, no_hp, golongan, jabatan, foto_url, wilayah_id,
      role_admin, is_kakan, is_active,
      wilayah:wilayah_id ( id, kode_wilayah, nama_wilayah, nama_unit_kerja, level )
    `)
    .eq('is_active', true)
    .neq('role_admin', 'SUPER_ADMIN')
    .in('wilayah_id', wilayahIds)
    .order('nama', { ascending: true })
    .limit(1000);

  if (kata_kunci) query = query.ilike('nama', `%${kata_kunci}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Gagal mencari pegawai: ${error.message}`);

  return (data ?? []).map((p) => ({
    ...p,
    unit_kerja: p.wilayah?.nama_unit_kerja || p.wilayah?.nama_wilayah || '-',
  }));
}

// =============================================================================
// PARTISIPAN & TOKEN
// =============================================================================

/**
 * Ambil daftar token nominee dengan data lengkap pegawai.
 * Dipakai di halaman PartisipanPeriode (tab Nominee).
 *
 * @async
 * @function fetchDaftarNomineeLengkap
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array token nominee dengan data lengkap
 *
 * @example
 * const nominee = await fetchDaftarNomineeLengkap(1);
 * // [{
 * //   id: 1,
 * //   token_akses: 'uuid-here',
 * //   is_digunakan: false,
 * //   nominee: { id: 5, nama: 'John', nip_baru: '...', unit_kerja: '...' }
 * // }]
 */
export async function fetchDaftarNomineeLengkap(periodeId) {
  const { data, error } = await supabase
    .from('akses_nominee')
    .select(`
      id,
      token_akses,
      is_digunakan,
      submitted_at,
      notifikasi_wa_sent_at,
      notifikasi_email_sent_at,
      nominee:pegawai ( id, nama, nip, nip_baru, foto_url, no_hp, email, wilayah:wilayah_id(nama_wilayah, nama_unit_kerja) )
    `)
    .eq('periode_id', periodeId);

  if (error) throw new Error(`Gagal memuat daftar token nominee: ${error.message}`);

  return (data ?? []).map(item => {
    const p = item.nominee;
    const unitKerja = p?.wilayah?.nama_unit_kerja || p?.wilayah?.nama_wilayah || '-';
    return {
      ...item,
      nominee: p ? { ...p, unit_kerja: unitKerja } : null
    };
  });
}

/**
 * Ambil daftar token penilai dengan data lengkap pegawai.
 * Dipakai di halaman PartisipanPeriode (tab Penilai).
 *
 * @async
 * @function fetchDaftarPenilaiLengkap
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array token penilai dengan data lengkap
 *
 * @example
 * const penilai = await fetchDaftarPenilaiLengkap(1);
 */
export async function fetchDaftarPenilaiLengkap(periodeId) {
  const { data, error } = await supabase
    .from('akses_penilai')
    .select(`
      id,
      token_akses,
      is_digunakan,
      submitted_at,
      notifikasi_wa_sent_at,
      notifikasi_email_sent_at, is_can_vote_own_region, blocked_nominee_ids, pegawai ( id, wilayah_id, nama, nip, nip_baru, foto_url, no_hp, email, wilayah:wilayah_id(nama_wilayah, nama_unit_kerja) )
    `)
    .eq('periode_id', periodeId);

  if (error) throw new Error(`Gagal memuat daftar token penilai: ${error.message}`);

  return (data ?? []).map(item => {
    const p = item.pegawai;
    const unitKerja = p?.wilayah?.nama_unit_kerja || p?.wilayah?.nama_wilayah || '-';
    return {
      ...item,
      pegawai: p ? { ...p, unit_kerja: unitKerja } : null
    };
  });
}

/**
 * Ambil daftar token juri dengan data lengkap pegawai.
 * Dipakai di halaman PartisipanPeriode (tab Juri).
 *
 * @async
 * @function fetchDaftarJuriLengkap
 * @param {number} periodeId - ID periode penilaian
 * @returns {Promise<Object[]>} Array token juri dengan data lengkap
 *
 * @example
 * const juri = await fetchDaftarJuriLengkap(1);
 * // [{
 * //   id: 1,
 * //   token_akses: 'uuid-here',
 * //   is_digunakan: false,
 * //   is_ketua_juri: true,
 * //   pegawai: { id: 5, nama: 'John', nip_baru: '...', unit_kerja: '...' }
 * // }]
 */
export async function fetchDaftarJuriLengkap(periodeId) {
  const { data, error } = await supabase
    .from('juri_periode')
    .select(`
      id,
      token_akses,
      is_digunakan,
      is_ketua_juri,
      submitted_at,
      notifikasi_wa_sent_at,
      notifikasi_email_sent_at, is_can_vote_own_region, blocked_nominee_ids, pegawai ( id, wilayah_id, nama, nip, nip_baru, foto_url, no_hp, email, wilayah:wilayah_id(nama_wilayah, nama_unit_kerja) )
    `)
    .eq('periode_id', periodeId);

  if (error) throw new Error(`Gagal memuat daftar token juri: ${error.message}`);

  return (data ?? []).map(item => {
    const p = item.pegawai;
    const unitKerja = p?.wilayah?.nama_unit_kerja || p?.wilayah?.nama_wilayah || '-';
    return {
      ...item,
      pegawai: p ? { ...p, unit_kerja: unitKerja } : null
    };
  });
}
 

/**
 * Toggle custom blacklist untuk juri dan nominee tertentu.
 */
export async function toggleBlockJuriNominee(juriPeriodeId, nomineeId, currentBlockedIds) {
  const current = Array.isArray(currentBlockedIds) ? currentBlockedIds : [];
  let newBlockedIds = [...current];
  if (newBlockedIds.includes(nomineeId)) {
    newBlockedIds = newBlockedIds.filter(id => id !== nomineeId);
  } else {
    newBlockedIds.push(nomineeId);
  }
  const { data, error } = await supabase
    .from('juri_periode')
    .update({ blocked_nominee_ids: newBlockedIds })
    .eq('id', juriPeriodeId)
    .select()
    .single();
  if (error) throw new Error('Gagal update custom blacklist: ' + error.message);
  return data;
}

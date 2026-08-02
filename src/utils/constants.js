/**
 * @fileoverview Konstanta aplikasi Sistem Penilaian Pegawai.
 * File ini mencerminkan PERSIS enum & aturan yang didefinisikan di database.
 * Jika skema SQL berubah, KONSEKUEN sinkronkan juga file ini.
 *
 * @module utils/constants
 */

/**
 * Enum untuk Mode Penilaian.
 * Mencerminkan `mode_penilaian_enum` di tabel `periode_penilaian`.
 *
 * @readonly
 * @enum {string}
 * @property {string} MODE_1A - Voting Evaluatif: Penilai memberi skor pada setiap pertanyaan narasi
 * @property {string} MODE_1B - Quick Vote: Pilih 1 nominee langsung, atau vote per kategori (opsional)
 * @property {string} MODE_2A - Seleksi & Scoring: Pilih 1 nominee favorit + beri skor per kriteria
 * @property {string} MODE_2 - Panel Dewan Juri: Kumpulan juri menilai berdasarkan kategori berbobot
 *
 * @example
 * // Mode 1A: Nominee menjawab pertanyaan narasi, penilai memberi skor
 * // Mode 1B: Voting cepat (flat) atau voting per kategori (jika admin menambahkan kategori)
 * // Mode 2A: Pilih 1 favorit + beri skor (oleh penilai)
 * // Mode 2: Juri menilai berdasarkan kategori (bobot tiap kategori harus 100%)
 */
export const MODE_PENILAIAN = Object.freeze({
  MODE_1A: 'MODE_1A',
  MODE_1B: 'MODE_1B',
  MODE_2A: 'MODE_2A',
  MODE_2: 'MODE_2',
});

/**
 * Enum untuk Status Periode Penilaian.
 * Mencerminkan `status_periode_enum` di tabel `periode_penilaian`.
 *
 * @readonly
 * @enum {string}
 * @property {string} DRAFT - Periode belum dimulai, masih dalam persiapan
 * @property {string} BERJALAN - Periode aktif, peserta bisa submit penilaian
 * @property {string} SELESAI - Periode ditutup, tidak ada submissi baru
 * @property {string} DIARSIPKAN - Periode disimpan untuk referensi/rekonsiliasi
 *
 * @example
 * // Alur status: DRAFT -> BERJALAN -> SELESAI -> DIARSIPKAN
 */
export const STATUS_PERIODE = Object.freeze({
  DRAFT: 'DRAFT',
  BERJALAN: 'BERJALAN',
  SELESAI: 'SELESAI',
  DIARSIPKAN: 'DIARSIPKAN',
});

/**
 * Enum untuk Role Admin Sistem.
 * Mencerminkan `user_role_enum` di tabel `pegawai`.
 *
 * @readonly
 * @enum {string}
 * @property {string} SUPER_ADMIN - Akses penuh ke seluruh data di semua wilayah
 * @property {string} ADMIN_PROVINSI - Akses penuh ke data di level provinsi
 * @property {string} ADMIN_KABKOTA - Akses terbatas ke data di level kabupaten/kota tertentu
 * @property {string} USER_BIASA - Role default, tidak memiliki hak akses admin
 *
 * @example
 * // SUPER_ADMIN membuat periode di level provinsi
 * // ADMIN_KABKOTA hanya bisa mengelola data di wilayahnya sendiri
 * // USER_BIASA tidak bisa mengakses halaman admin
 */
export const ROLE_ADMIN = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN_PROVINSI: 'ADMIN_PROVINSI',
  ADMIN_KABKOTA: 'ADMIN_KABKOTA',
  USER_BIASA: 'USER_BIASA',
});

/**
 * Status interpretasi akses token (dihitung di client).
 * BUKAN kolom di database - dihitung dari kombinasi:
 * - tgl_mulai & tgl_selesai periode
 * - status periode
 * - is_digunakan token
 *
 * @readonly
 * @enum {string}
 * @property {string} TOKEN_TIDAK_VALID - Token tidak ditemukan di database
 * @property {string} BELUM_DIBUKA - Periode belum dimulai (sekarang < tgl_mulai)
 * @property {string} TELAH_DITUTUP - Periode sudah ditutup (sekarang > tgl_selesai atau status SELESAI/DIARSIPKAN)
 * @property {string} SUDAH_DIGUNAKAN - Token sudah dipakai, tampilkan read-only
 * @property {string} AKTIF - Token valid dan aktif, peserta bisa mengisi
 *
 * @example
 * // Dipakai di PenilaiPage, JuriPage, NomineePage
 * // untuk memilih UI kondisional yang tepat
 */
export const STATUS_AKSES_TOKEN = Object.freeze({
  TOKEN_TIDAK_VALID: 'TOKEN_TIDAK_VALID',
  BELUM_DIBUKA: 'BELUM_DIBUKA',
  TELAH_DITUTUP: 'TELAH_DITUTUP',
  SUDAH_DIGUNAKAN: 'SUDAH_DIGUNAKAN',
  AKTIF: 'AKTIF',
});

/**
 * Label ramah pengguna untuk mode penilaian.
 * Untuk ditampilkan di UI (badge, header, tooltip).
 *
 * @readonly
 * @type {Object.<string, string>}
 */
export const MODE_PENILAIAN_LABEL = Object.freeze({
  [MODE_PENILAIAN.MODE_1A]: 'Voting Evaluatif',
  [MODE_PENILAIAN.MODE_1B]: 'Quick Vote',
  [MODE_PENILAIAN.MODE_2A]: 'Seleksi & Scoring',
  [MODE_PENILAIAN.MODE_2]: 'Panel Dewan Juri',
});

/**
 * Nama bucket Supabase Storage untuk menyimpan dokumen bukti inovasi.
 * File di-upload ke bucket ini dengan path: `{nominee_id}/{filename}`
 *
 * @type {string}
 */
export const STORAGE_BUCKET_BUKTI = 'dokumen-bukti';

/**
 * Batas ukuran file upload dokumen bukti inovasi.
 * Sesuai spesifikasi sistem: Maksimal 10MB per file.
 *
 * @type {number}
 */
export const MAX_FILE_SIZE_MB = 10;

/**
 * Batas ukuran file dalam bytes (dihitung dari MAX_FILE_SIZE_MB).
 *
 * @type {number}
 */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10MB = 10485760 bytes

/**
 * Tipe MIME yang diizinkan untuk upload dokumen bukti.
 * Mencakup PDF dan format Microsoft Office (Word, Excel, PowerPoint).
 *
 * @readonly
 * @type {string[]}
 *
 * @example
 * // File yang diizinkan:
 * // - application/pdf (PDF)
 * // - application/msword (DOC)
 * // - application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX)
 * // - application/vnd.ms-excel (XLS)
 * // - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (XLSX)
 * // - application/vnd.ms-powerpoint (PPT)
 * // - application/vnd.openxmlformats-officedocument.presentationml.presentation (PPTX)
 */
export const ALLOWED_FILE_TYPES = Object.freeze([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

// ============================================================================
// KLASIFIKASI JABATAN (UPPER RANK)
// ============================================================================

/**
 * Pola Regex untuk mendeteksi Jabatan Upper Rank.
 *
 * Upper Rank mencakup:
 * - Jabatan Struktural Eselon 3: Kepala BPS Provinsi, Kepala BPS Kabupaten/Kota,
 *   Kepala Bagian Umum
 * - Jabatan Fungsional dengan jenjang Ahli Madya
 *
 * REFERENSI:
 * - Kepala Subbagian Umum (Eselon 4) BUKAN Upper Rank
 * - JF Ahli Muda, JF Ahli Pertama, JF Mahir, JF Terampil BUKAN Upper Rank
 *
 * @type {RegExp[]}
 *
 * @example
 * // Upper rank (match):
 * // - "Kepala BPS Provinsi"
 * // - "Statistisi Ahli Madya BPS Kabupaten/Kota"
 * // - "Pranata Komputer Ahli Madya BPS Provinsi"
 * //
 * // BUKAN Upper rank (no match):
 * // - "Staf BPS Provinsi"
 * // - "Statistisi Ahli Muda BPS Kabupaten/Kota"
 * // - "Statistisi Ahli Pertama BPS Kabupaten/Kota"
 * // - "Pranata Komputer Mahir BPS Kabupaten/Kota"
 */
export const UPPER_RANK_PATTERNS = Object.freeze([
  // === JABATAN STRUKTURAL ESELON 3 ===
  /^kepala\s+bps\s+provinsi$/i,
  /^kepala\s+bps\s+kabupaten\s*\/\s*kota$/i,
  /^kepala\s+bagian\s+umum$/i,

  // === JABATAN FUNGSIONAL - AHLI MADYA ===
  // Menggunakan pola umum "Ahli Madya" agar fleksibel untuk semua unit kerja
  /ahli\s+madya/i,
]);

/**
 * Label untuk filter klasifikasi jabatan.
 *
 * @readonly
 * @type {Object.<string, string>}
 */
export const KLASIFIKASI_JABATAN_LABEL = Object.freeze({
  ALL: 'Semua Jabatan',
  UPPER_RANK: 'Upper Rank (Eselon 3 + JF Ahli Madya)',
});

/**
 * Cek apakah suatu jabatan termasuk Upper Rank menggunakan regex patterns.
 * Perbandingan dilakukan case-insensitive.
 *
 * @param {string} jabatan - Nama jabatan untuk dicek
 * @returns {boolean} True jika termasuk Upper Rank
 *
 * @example
 * isUpperRank('Statistisi Ahli Madya BPS Kabupaten/Kota') // => true
 * isUpperRank('Staf BPS Provinsi') // => false
 */
export function isUpperRank(jabatan) {
  if (!jabatan || typeof jabatan !== 'string') return false;
  const normalized = jabatan.trim();
  return UPPER_RANK_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Filter daftar pegawai berdasarkan klasifikasi jabatan.
 *
 * @param {Object[]} daftarPegawai - Array objek pegawai
 * @param {'ALL'|'UPPER_RANK'} klasifikasi - Jenis filter
 * @returns {Object[]} Array pegawai yang sudah difilter
 *
 * @example
 * const semua = filterByKlasifikasiJabatan(pegawaiList, 'ALL');
 * const upper = filterByKlasifikasiJabatan(pegawaiList, 'UPPER_RANK');
 */
export function filterByKlasifikasiJabatan(daftarPegawai, klasifikasi) {
  if (klasifikasi === 'UPPER_RANK') {
    return daftarPegawai.filter((p) => isUpperRank(p.jabatan));
  }
  return daftarPegawai; // Kembalikan semua jika 'ALL'
}

// ============================================================================
// HELPER AVATAR
// ============================================================================

/**
 * URL base folder foto avatar di GitHub raw content.
 * Ganti `USERNAME/REPO` sesuai repository GitHub Anda.
 *
 * @type {string}
 */
export const GITHUB_AVATAR_BASE_URL = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress';

/**
 * Helper universal untuk mendapatkan URL avatar pegawai dengan fallback otomatis.
 * Repo GitHub menggunakan NIP lama (9 digit).
 * Urutan prioritas: foto_url > NIP lama (nip) > ui-avatars.com
 *
 * @param {Object} pegawai - Object pegawai dari database
 * @param {string} [pegawai.foto_url] - URL foto profil (jika ada)
 * @param {string} [pegawai.nip] - NIP lama 9 digit
 * @param {string} [pegawai.nip_baru] - NIP baru 15 digit
 * @param {string} [pegawai.nama] - Nama pegawai (untuk avatar generator)
 * @returns {string} URL avatar yang siap digunakan di <img src="">
 *
 * @example
 * // Ada foto_url
 * getPegawaiAvatarUrl({ foto_url: 'https://...', nama: 'John' })
 * // => 'https://...'
 *
 * @example
 * // Tidak ada foto, ada NIP lama
 * getPegawaiAvatarUrl({ nip: '190000003', nama: 'John' })
 * // => 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/190000003.jpg'
 *
 * @example
 * // Tidak ada keduanya
 * getPegawaiAvatarUrl({ nama: 'John Doe' })
 * // => 'https://ui-avatars.com/api/?name=John+Doe&background=0F172A&color=fff'
 */
export function getPegawaiAvatarUrl(pegawai) {
  // Prioritas 1: Gunakan foto_url jika tersedia
  if (pegawai?.foto_url) return pegawai.foto_url;

  // Prioritas 2: Generate avatar dari GitHub Repo (NIP lama 9 digit)
  const nip = pegawai?.nip;
  if (nip && typeof nip === 'string' && nip.length > 0) {
    return `${GITHUB_AVATAR_BASE_URL}/${nip}.jpg`;
  }

  // Prioritas 3: Fallback ke ui-avatars.com
  const nama = pegawai?.nama || 'Pegawai';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=0F172A&color=fff`;
}

/**
 * Helper untuk cek apakah NIP valid untuk avatar.
 * NIP harus string non-empty.
 *
 * @param {string|undefined|null} nip
 * @returns {boolean}
 */
export function isValidNip(nip) {
  return nip && typeof nip === 'string' && nip.length > 0;
}

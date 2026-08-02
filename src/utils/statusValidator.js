/**
 * @fileoverview Validasi status akses token berdasarkan jadwal dan status periode.
 *
 * MODUL INI BERISI FUNGSI MURNI (PURE FUNCTIONS):
 * - Tidak memanggil network/API
 * - Mudah ditulis unit test
 * - Bisa dipakai ulang di komponen manapun
 *
 * ATURAN PRIORITAS PENGECEKAN:
 * 1. TOKEN_TIDAK_VALID - Token tidak ditemukan di database
 * 2. BELUM_DIBUKA    - Sekarang < tgl_mulai periode
 * 3. TELAH_DITUTUP   - Sekarang > tgl_selesai ATAU status SELESAI/DIARSIPKAN
 * 4. SUDAH_DIGUNAKAN - Token sudah dipakai sebelumnya
 * 5. AKTIF           - Token valid dan boleh digunakan
 *
 * @module utils/statusValidator
 */

import { STATUS_AKSES_TOKEN, STATUS_PERIODE } from './constants';

/**
 * Tentukan status akses token berdasarkan jadwal dan status periode.
 *
 * Fungsi ini mengimplementasikan aturan bisnis "Strict Schedule & Status Lock".
 * Urutan pengecekan MENGIKUTI prioritas spesifikasi:
 *
 * 1. Token tidak ditemukan (tidak ada periode)
 * 2. Periode belum dibuka (sekarang < tgl_mulai)
 * 3. Periode sudah ditutup (sekarang > tgl_selesai ATAU status SELESAI/DIARSIPKAN)
 * 4. Token sudah dipakai (is_digunakan = true)
 * 5. Aktif (token valid dan boleh digunakan)
 *
 * @function getStatusAksesToken
 * @param {Object|null} periode - Data periode dari database (hasil join saat fetch token)
 * @param {string} [periode.tgl_mulai] - Tanggal mulai periode (ISO string)
 * @param {string} [periode.tgl_selesai] - Tanggal selesai periode (ISO string)
 * @param {string} [periode.status] - Status periode (DRAFT, BERJALAN, SELESAI, DIARSIPKAN)
 * @param {boolean} isDigunakan - Apakah token sudah digunakan
 * @param {Date} [sekarang=new Date()] - Waktu referensi (untuk unit testing)
 * @returns {string} Status akses token (salah satu nilai STATUS_AKSES_TOKEN)
 *
 * @example
 * // Token belum dibuka
 * const status = getStatusAksesToken(
 *   { tgl_mulai: '2026-08-01', tgl_selesai: '2026-08-31', status: 'BERJALAN' },
 *   false,
 *   new Date('2026-07-15')
 * );
 * // => 'BELUM_DIBUKA'
 *
 * @example
 * // Token valid dan aktif
 * const status = getStatusAksesToken(
 *   { tgl_mulai: '2026-07-01', tgl_selesai: '2026-07-31', status: 'BERJALAN' },
 *   false,
 *   new Date('2026-07-15')
 * );
 * // => 'AKTIF'
 *
 * @example
 * // Token sudah digunakan
 * const status = getStatusAksesToken(
 *   { tgl_mulai: '2026-07-01', tgl_selesai: '2026-07-31', status: 'BERJALAN' },
 *   true,
 *   new Date('2026-07-15')
 * );
 * // => 'SUDAH_DIGUNAKAN'
 *
 * @see STATUS_AKSES_TOKEN
 * @see STATUS_PERIODE
 */
export function getStatusAksesToken(periode, isDigunakan, sekarang = new Date()) {
  // Cek 0: Tidak ada periode = token tidak valid
  if (!periode) {
    return STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID;
  }

  const tglMulai = new Date(periode.tgl_mulai);
  const tglSelesai = new Date(periode.tgl_selesai);

  // Cek 1: Apakah periode belum dibuka?
  if (sekarang < tglMulai) {
    return STATUS_AKSES_TOKEN.BELUM_DIBUKA;
  }

  // Cek 2: Apakah periode sudah ditutup?
  // Ditutup jika: sekarang > tgl_selesai ATAU status = SELESAI/DIARSIPKAN
  const statusDitutup =
    periode.status === STATUS_PERIODE.SELESAI ||
    periode.status === STATUS_PERIODE.DIARSIPKAN;
  if (sekarang > tglSelesai || statusDitutup) {
    return STATUS_AKSES_TOKEN.TELAH_DITUTUP;
  }

  // Cek 3: Apakah token sudah digunakan?
  if (isDigunakan) {
    return STATUS_AKSES_TOKEN.SUDAH_DIGUNAKAN;
  }

  // Cek 4: Semua pengecekan lolos = AKTIF
  return STATUS_AKSES_TOKEN.AKTIF;
}

/**
 * Helper: Cek apakah partisipan boleh mengisi form penilaian.
 *
 * Hanya return true jika status adalah AKTIF.
 * Status lain (BELUM_DIBUKA, TELAH_DITUTUP, SUDAH_DIGUNAKAN) = read-only.
 *
 * @function bolehMengisiForm
 * @param {string} statusAkses - Status akses dari getStatusAksesToken()
 * @returns {boolean} true jika boleh mengisi form
 *
 * @example
 * if (bolehMengisiForm(status)) {
 *   // Tampilkan form penilaian
 * } else {
 *   // Tampilkan pesan status
 * }
 *
 * @see getStatusAksesToken
 */
export function bolehMengisiForm(statusAkses) {
  return statusAkses === STATUS_AKSES_TOKEN.AKTIF;
}

/**
 * Pesan UI default per status akses token.
 * Dipakai sebagai fallback teks di halaman Penilai, Juri, dan Nominee.
 *
 * @readonly
 * @type {Object.<string, string>}
 *
 * @example
 * // Tampilkan pesan sesuai status
 * const pesan = PESAN_STATUS_AKSES[status];
 * return <p className="text-warning">{pesan}</p>;
 */
export const PESAN_STATUS_AKSES = Object.freeze({
  /** Token tidak ditemukan di database */
  [STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID]: 'Link tidak valid atau token tidak ditemukan.',

  /** Sekarang < tgl_mulai periode */
  [STATUS_AKSES_TOKEN.BELUM_DIBUKA]: 'Periode Penilaian Belum Dibuka.',

  /** Sekarang > tgl_selesai atau status SELESAI/DIARSIPKAN */
  [STATUS_AKSES_TOKEN.TELAH_DITUTUP]: 'Periode Penilaian Telah Ditutup.',

  /** Token sudah dipakai sebelumnya (read-only mode) */
  [STATUS_AKSES_TOKEN.SUDAH_DIGUNAKAN]: 'Anda sudah mengisi dan mengirimkan penilaian menggunakan link ini.',

  /** Token valid dan aktif, boleh mengisi */
  [STATUS_AKSES_TOKEN.AKTIF]: 'Silakan lengkapi penilaian Anda.',
});

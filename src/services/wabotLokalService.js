/**
 * @fileoverview Wabot Lokal Service
 *
 * Interface untuk kirim pesan WhatsApp via Wabot Lokal (http://localhost:3000).
 *
 * @module services/wabotLokalService
 */

// Gunakan environment variable jika ada, default ke localhost:3000
const BOT_URL = import.meta.env.VITE_BOT_URL || 'http://localhost:3000';

/**
 * Kirim pesan tunggal via Wabot Lokal.
 *
 * @async
 * @param {string} nomorHP - Nomor HP tujuan
 * @param {string} pesan - Isi pesan WhatsApp
 * @returns {Promise<{status: boolean, message?: string, reason?: string}>}
 */
export async function kirimPesanLocalBot(nomorHP, pesan) {
  try {
    const response = await fetch(`${BOT_URL}/api/kirim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nomor: nomorHP,
        pesan: pesan,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        status: true,
        message: 'Pesan berhasil dikirim via bot lokal',
      };
    } else {
      return {
        status: false,
        reason: data.error || 'Gagal mengirim pesan',
      };
    }
  } catch (error) {
    console.error('Error in kirimPesanLocalBot:', error);
    return {
      status: false,
      reason: error.message || 'Koneksi ke bot lokal gagal',
    };
  }
}

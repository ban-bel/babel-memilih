/**
 * @fileoverview Wabot Lokal Service
 *
 * Interface untuk kirim pesan WhatsApp via Wabot Lokal (http://localhost:3000).
 *
 * @module services/wabotLokalService
 */

// Gunakan environment variable jika ada, default ke localhost:3000
const BOT_URL = import.meta.env.VITE_WA_API_URL;

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
    const response = await fetch(`${BOT_URL}/send`, {
      method: 'POST',
            headers: {
        'Content-Type': 'application/json',
        'X-API-Key': import.meta.env.VITE_WA_API_KEY
      },
      body: JSON.stringify({
        nomor: nomorHP,
        pesan: pesan,
      }),
    });

            const data = await response.json();

    if (data.success || response.ok) {
      return {
        status: true,
        message: 'Pesan berhasil dikirim via bot lokal',
      };
    } else {
      let isRateLimitError = response.status === 429;
      const errorMsg = data.error || data.message || 'Gagal mengirim pesan';
      if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('rate limit')) {
          isRateLimitError = true;
      }
      
      return {
        status: false,
        reason: errorMsg,
        isRateLimit: isRateLimitError
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

export function formatHP(noHP) {
  if (!noHP) return null;
  const clean = String(noHP).replace(/\D/g, '');
  if (clean.startsWith('0')) return '62' + clean.slice(1);
  if (clean.startsWith('62')) return clean;
  return '62' + clean;
}

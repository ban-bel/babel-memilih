/**
 * @fileoverview Wabot Lokal Service
 *
 * Interface untuk kirim pesan WhatsApp via Wabot Lokal (http://localhost:3000).
 *
 * @module services/wabotLokalService
 */

// Gunakan environment variable jika ada, default ke localhost:3000

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
    const response = await fetch('/api/universal-bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: '/send',
        payload: {
          nomor: nomorHP,
          pesan: pesan,
        }
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


/**
 * Kirim Email via Wabot Lokal / Universal API
 */
export async function kirimEmailLocalBot({ email, nama_penerima, sapaan, link_penilaian, nama_periode }) {
  try {
    const finalSapaan = sapaan || 'Bapak/Ibu';
    const finalPeriode = nama_periode || 'Babel Memilih';

    const pembukaList = [
      `Semoga hari ${finalSapaan} lagi on fire banget nih! 🔥`,
      `Gimana kabarnya ${finalSapaan}? Semoga selalu dilancarkan segalanya ya. ✨`,
      `Halo halo! Semoga ${finalSapaan} lagi santai sejenak dari rutinitas. ☕`,
      `Panggilan cepat buat ${finalSapaan} yang super sibuk! 🚀`
    ];
    const pembuka = pembukaList[Math.floor(Math.random() * pembukaList.length)];

    const penutupList = [
      `Makasih banyak udah nyempetin waktu di sela-sela kesibukannya ya ${finalSapaan}! 🙏`,
      `Insight dari ${finalSapaan} bener-bener berharga buat kita. Thanks a lot! 💡`,
      `We owe you one! Makasih atas bantuannya ${finalSapaan}. 🎯`
    ];
    const penutup = penutupList[Math.floor(Math.random() * penutupList.length)];

    const subject = `Panggilan Kepada ${finalSapaan} ${nama_penerima}: ${finalPeriode} Menunggu! 🚀`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #1a365d;">Panggilan untuk ${finalSapaan} ${nama_penerima}! 🚀</h2>
        <p>Yth. ${finalSapaan} <strong>${nama_penerima || 'Partisipan'}</strong>, 👋</p>
        <p>${pembuka}</p>
        <p><em>Not to rush you or anything</em>, tapi <strong>${finalPeriode}</strong> udah mulai nih! Kita butuh banget <em>insight</em> dan penilaian dari ${finalSapaan} biar hasilnya makin valid dan mantap.</p>
        <p><em>Less typing, more action.</em> Langsung aja klik tombol di bawah buat masuk ke sistem:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${link_penilaian}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ✨ Meluncur ke Portal!
          </a>
        </div>
        <p><em>Reminder</em> kecil: Link ini <em>strictly confidential</em> (rahasia) ya ${finalSapaan}, jangan di-share ke orang lain. 🤫</p>
        
        <p style="margin-top: 30px; font-weight: bold;">
          ${penutup}<br><br>
          Yours in Friendship and Chaos,<br>
          <span style="color: #3b82f6;">Tim Diseminasi Statistik</span>
        </p>
        
        <p style="font-size: 0.85em; color: #666; margin-top: 40px;">
          Atau salin tautan berikut ke browser Anda jika tombol tidak berfungsi:<br>
          <a href="${link_penilaian}" style="color: #3b82f6;">${link_penilaian}</a>
        </p>
        <hr style="border: none; border-top: 1px dashed #eaeaea; margin: 30px 0;">
        <p style="font-size: 0.75em; color: #999; text-align: center;">
          Pesan ini dikirim secara otomatis oleh Sistem ${finalPeriode}.<br>
          Badan Pusat Statistik Provinsi Kepulauan Bangka Belitung
        </p>
      </div>
    `;

    const textBody = `Yth. ${finalSapaan} ${nama_penerima || 'Partisipan'}, 👋\n\n${pembuka}\n\nNot to rush you or anything, tapi ${finalPeriode} udah mulai nih! Kita butuh banget insight dan penilaian dari ${finalSapaan} biar hasilnya makin valid dan mantap.\n\nLess typing, more action. Langsung aja akses tautan berikut untuk masuk ke sistem:\n${link_penilaian}\n\nReminder kecil: Tautan di atas bersifat strictly confidential khusus untuk ${finalSapaan}. Jangan di-share ya! 🤫\n\n${penutup}\n\nYours in Friendship and Chaos,\nTim Diseminasi Statistik\nBPS Provinsi Kepulauan Bangka Belitung`;

    const response = await fetch('/api/universal-bot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: '/email',
        payload: {
          to: email,
          subject: subject,
          text: textBody,
          html: htmlBody
        }
      }),
    });

    const data = await response.json();

    if (data.success || response.ok) {
      return { status: true, message: 'Email berhasil dikirim via bot lokal' };
    } else {
      return { status: false, reason: data.error || data.message || 'Gagal mengirim email via API' };
    }
  } catch (error) {
    console.error('Error in kirimEmailLocalBot:', error);
    return { status: false, reason: error.message || 'Koneksi ke bot lokal gagal' };
  }
}

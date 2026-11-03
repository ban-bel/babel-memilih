import nodemailer from 'nodemailer';
import { verifikasiAdmin, escapeHtml, EMAIL_REGEX, stripNewlines } from './_auth.js';

/**
 * Link penilaian hanya boleh mengarah ke host aplikasi ini sendiri
 * (atau host tambahan di env APP_ALLOWED_HOSTS, dipisah koma),
 * agar endpoint tidak bisa dipakai menyebar link phishing.
 */
function linkDiizinkan(link, req) {
  let parsed;
  try {
    parsed = new URL(link);
  } catch {
    return false;
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) return false;

  const host = parsed.host.toLowerCase();
  const requestHost = String(req.headers?.host || '').toLowerCase();
  const extraHosts = String(process.env.APP_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return host === requestHost || extraHosts.includes(host);
}

export default async function handler(req, res) {
  // Hanya melayani method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Hanya admin yang login yang boleh mengirim email
  const auth = await verifikasiAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, message: auth.message });
  }

  const { email, nama_penerima: rawNama, link_penilaian: rawLink, sapaan, nama_periode } = req.body || {};

  if (!email || !rawLink) {
    return res.status(400).json({ message: 'Email tujuan dan link penilaian wajib diisi.' });
  }
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Alamat email tidak valid.' });
  }
  if (typeof rawLink !== 'string' || !linkDiizinkan(rawLink, req)) {
    return res.status(400).json({ message: 'Link penilaian tidak diizinkan.' });
  }
  if (!process.env.SMTP_USER) {
    console.error('Missing Environment Variable: SMTP_USER');
    return res.status(500).json({ success: false, message: 'Konfigurasi SMTP server tidak lengkap.' });
  }

  // Versi plain (tanpa newline) untuk subject & text body
  const plainSapaan = stripNewlines(sapaan) || 'Bapak/Ibu';
  const plainPeriode = stripNewlines(nama_periode) || 'Babel Memilih';
  const plainNama = stripNewlines(rawNama);

  // Versi ter-escape untuk HTML body
  const finalSapaan = escapeHtml(plainSapaan);
  const finalPeriode = escapeHtml(plainPeriode);
  const nama_penerima = escapeHtml(plainNama);
  const link_penilaian = escapeHtml(rawLink);

  try {
    // Inisialisasi Transporter Nodemailer dengan SMTP BPS dari Environment Variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: true, // Gunakan TLS/SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Variasi sapaan awal untuk menghindari deteksi spam (Energetic & Witty)
    const pembukaVariasi = [
      (s) => `Semoga hari ${s} lagi on fire banget nih! 🔥`,
      (s) => `Gimana kabarnya ${s}? Semoga selalu dilancarkan segalanya ya. 🚀`,
      (s) => `Halo halo! Semoga ${s} lagi santai sejenak dari rutinitas. ☕`,
      (s) => `Panggilan cepat buat ${s} yang super sibuk! ⚡`
    ];
    const pembukaFn = pembukaVariasi[Math.floor(Math.random() * pembukaVariasi.length)];

    const penutupVariasi = [
      (s) => `Makasih banyak udah nyempetin waktu di sela-sela kesibukannya ya ${s}! 🙏`,
      (s) => `Insight dari ${s} bener-bener berharga buat kita. Thanks a lot! 🌟`,
      (s) => `We owe you one! Makasih atas bantuannya ${s}. 🎉`
    ];
    const penutupFn = penutupVariasi[Math.floor(Math.random() * penutupVariasi.length)];

    const pembuka = pembukaFn(finalSapaan);
    const penutup = penutupFn(finalSapaan);

    // Template HTML Email (Energetic, Witty & To The Point)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #1a365d;">Panggilan untuk ${finalSapaan} ${nama_penerima}! 🎯</h2>
        <p>Yth. ${finalSapaan} <strong>${nama_penerima || 'Partisipan'}</strong>, 👋</p>
        <p>${pembuka}</p>
        <p><em>Not to rush you or anything</em>, tapi <strong>${finalPeriode}</strong> udah mulai nih! Kita butuh banget <em>insight</em> dan penilaian dari ${finalSapaan} biar hasilnya makin valid dan mantap.</p>
        <p><em>Less typing, more action.</em> Langsung aja klik tombol di bawah buat masuk ke sistem:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${link_penilaian}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            🚀 Meluncur ke Portal!
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

    // Plain text fallback (tidak perlu escape HTML)
    const textBody = `Yth. ${plainSapaan} ${plainNama || 'Partisipan'}, 👋

${pembukaFn(plainSapaan)}

Not to rush you or anything, tapi ${plainPeriode} udah mulai nih! Kita butuh banget insight dan penilaian dari ${plainSapaan} biar hasilnya makin valid dan mantap.

Less typing, more action. Langsung aja akses tautan berikut untuk masuk ke sistem:
${rawLink}

Reminder kecil: Tautan di atas bersifat strictly confidential khusus untuk ${plainSapaan}. Jangan di-share ya! 🤫
${penutupFn(plainSapaan)}

Yours in Friendship and Chaos,
Tim Diseminasi Statistik
BPS Provinsi Kepulauan Bangka Belitung`;


    // Eksekusi pengiriman
    const info = await transporter.sendMail({
      from: `"${plainPeriode.replace(/"/g, '')} (Diseminasi Statistik)" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Panggilan Kepada ${plainSapaan} ${plainNama}: ${plainPeriode} Menunggu! 🎯`,
      text: textBody,
      html: htmlBody,
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email berhasil dikirim!', 
      messageId: info.messageId 
    });

  } catch (error) {
    // Detail error hanya di log server, tidak dikirim ke client
    console.error('Error pengiriman email (SMTP):', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal mengirim email.',
    });
  }
}

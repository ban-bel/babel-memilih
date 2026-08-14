import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Hanya melayani method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, nama_penerima, link_penilaian, sapaan, nama_periode } = req.body;

  const finalSapaan = sapaan || 'Bapak/Ibu';
  const finalPeriode = nama_periode || 'Babel Memilih';

  if (!email || !link_penilaian) {
    return res.status(400).json({ message: 'Email tujuan dan link penilaian wajib diisi.' });
  }

  try {
    // Inisialisasi Transporter Nodemailer dengan SMTP BPS
    // Prioritaskan dari Environment Variables, dengan fallback ke default
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // Gunakan TLS/SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Template HTML Email (Energetic, Witty & To The Point)
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #1a365d;">Panggilan untuk ${finalSapaan} ${nama_penerima}! 🎯</h2>
        <p>Halo ${finalSapaan} <strong>${nama_penerima || 'Partisipan'}</strong>! 👋</p>
        <p><em>Not to rush you or anything</em>, tapi <strong>${finalPeriode}</strong> udah mulai nih! Kita butuh banget <em>insight</em> dan penilaian dari ${finalSapaan} biar hasilnya makin valid dan mantap.</p>
        <p><em>Less typing, more action.</em> Langsung aja klik tombol di bawah buat masuk ke sistem:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${link_penilaian}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            🚀 Meluncur ke Portal!
          </a>
        </div>
        <p><em>Reminder</em> kecil: Link ini <em>strictly confidential</em> (rahasia) ya ${finalSapaan}. Makasih banyak udah nyempetin waktu di sela-sela kesibukannya! ☕</p>
        
        <p style="margin-top: 30px; font-weight: bold;">
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

    // Plain text fallback
    const textBody = `Halo ${finalSapaan} ${nama_penerima || 'Partisipan'}! 👋\n\nNot to rush you or anything, tapi ${finalPeriode} udah mulai nih! Kita butuh banget insight dan penilaian dari ${finalSapaan} biar hasilnya makin valid dan mantap.\n\nLess typing, more action. Langsung aja klik tautan di bawah ini buat masuk ke sistem:\n${link_penilaian}\n\nReminder kecil: Link ini strictly confidential ya ${finalSapaan}. Makasih banyak udah nyempetin waktu di sela-sela kesibukannya! ☕\n\nYours in Friendship and Chaos,\nTim Diseminasi Statistik`;

    // Eksekusi pengiriman
    const info = await transporter.sendMail({
      from: `"${finalPeriode} (Diseminasi Statistik)" <${process.env.SMTP_USER || 'kasiedls1900@bps.go.id'}>`,
      to: email,
      subject: `Panggilan Kepada ${finalSapaan} ${nama_penerima}: ${finalPeriode} Menunggu! 🎯`,
      text: textBody,
      html: htmlBody,
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email berhasil dikirim!', 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Error pengiriman email (SMTP):', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal mengirim email.',
      error: error.message 
    });
  }
}

import { verifikasiAdmin, EMAIL_REGEX, stripNewlines } from './_auth.js';

const MAX_PESAN_WA = 4096;
const MAX_SUBJECT = 300;
const MAX_EMAIL_BODY = 100_000;

/**
 * Validasi payload per endpoint. Mengembalikan pesan error atau null jika valid.
 * Payload dibangun ulang (whitelist field) agar tidak ada field liar yang diteruskan ke bot.
 */
function validasiPayload(endpoint, payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload tidak valid.' };

  if (endpoint === '/send') {
    const nomor = String(payload.nomor ?? '').replace(/\D/g, '');
    const pesan = payload.pesan;
    if (nomor.length < 10 || nomor.length > 15) return { error: 'Nomor HP tidak valid.' };
    if (typeof pesan !== 'string' || !pesan.trim()) return { error: 'Pesan wajib diisi.' };
    if (pesan.length > MAX_PESAN_WA) return { error: `Pesan melebihi ${MAX_PESAN_WA} karakter.` };
    return { clean: { nomor, pesan } };
  }

  if (endpoint === '/email') {
    const { to, subject, text, html } = payload;
    if (typeof to !== 'string' || !EMAIL_REGEX.test(to)) return { error: 'Alamat email tidak valid.' };
    if (typeof subject !== 'string' || !subject.trim()) return { error: 'Subject wajib diisi.' };
    if (subject.length > MAX_SUBJECT) return { error: 'Subject terlalu panjang.' };
    if ((text && typeof text !== 'string') || (html && typeof html !== 'string')) {
      return { error: 'Isi email tidak valid.' };
    }
    if ((text?.length ?? 0) > MAX_EMAIL_BODY || (html?.length ?? 0) > MAX_EMAIL_BODY) {
      return { error: 'Isi email terlalu besar.' };
    }
    return { clean: { to, subject: stripNewlines(subject), text, html } };
  }

  return { error: 'Endpoint tidak valid atau tidak diizinkan.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Hanya admin yang login yang boleh memakai proxy bot
  const auth = await verifikasiAdmin(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, message: auth.message });
  }

  const { endpoint, payload } = req.body || {};

  // '/send-bulk' dihapus dari daftar karena tidak dipakai oleh frontend
  const allowedEndpoints = ['/send', '/email'];
  if (!endpoint || !allowedEndpoints.includes(endpoint)) {
    return res.status(400).json({ success: false, message: 'Endpoint tidak valid atau tidak diizinkan.' });
  }

  const { clean, error: validationError } = validasiPayload(endpoint, payload);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    // Utamakan nama tanpa prefix VITE_ (prefix VITE_ berisiko ikut ter-bundle ke browser).
    // Fallback ke nama lama agar deployment yang sudah ada tetap jalan.
    const botUrl = process.env.WA_API_URL || process.env.VITE_WA_API_URL;
    const apiKey = process.env.WA_API_KEY || process.env.VITE_WA_API_KEY;

    if (!botUrl || !apiKey) {
      console.error('Missing Environment Variables: WA_API_URL or WA_API_KEY');
      return res.status(500).json({ success: false, message: 'Konfigurasi server bot tidak lengkap.' });
    }

    const response = await fetch(`${botUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(clean),
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    // Detail error hanya di log server, tidak dikirim ke client
    console.error(`Error Proxy Universal Bot [${endpoint}]:`, error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghubungi server Universal Bot API',
    });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { endpoint, payload } = req.body;

  const allowedEndpoints = ['/send', '/send-bulk', '/email'];
  if (!endpoint || !allowedEndpoints.includes(endpoint)) {
    return res.status(400).json({ success: false, message: 'Endpoint tidak valid atau tidak diizinkan.' });
  }

  try {
    const botUrl = process.env.VITE_WA_API_URL;
    const apiKey = process.env.WA_API_KEY || process.env.VITE_WA_API_KEY;

    if (!botUrl || !apiKey) {
      console.error('Missing Environment Variables: VITE_WA_API_URL or WA_API_KEY');
      return res.status(500).json({ success: false, message: 'Konfigurasi server bot tidak lengkap.' });
    }

    const response = await fetch(`${botUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
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
    console.error(`Error Proxy Universal Bot [${endpoint}]:`, error);
    return res.status(500).json({ 
      success: false, 
      message: 'Gagal menghubungi server Universal Bot API',
      error: error.message 
    });
  }
}

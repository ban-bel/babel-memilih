/**
 * @fileoverview Fonnte API Service
 *
 * Interface untuk kirim pesan WhatsApp via Fonnte.
 * Endpoint: https://api.fonnte.com/send
 *
 * Fitur human-like:
 * - Random typing time simulation
 * - Country code variation (occasional 0)
 * - Random delay variation
 *
 * Dokumentasi: https://fonnte.com
 *
 * @module services/fonnteService
 */

// Human-like typing simulation constants
const TYPING_CHANCE = 0.3; // 30% chance untuk enable typing indicator
const TYPING_TIME_MIN = 1;  // detik minimum "typing"
const TYPING_TIME_MAX = 3;  // detik maximum "typing"
const COUNTRY_CODE_SKIP_CHANCE = 0.05; // 5% chance untuk skip country code

/**
 * Format nomor HP ke format internasional Indonesia.
 * Konversi 08xx menjadi 62xx.
 *
 * @param {string|null} noHP - Nomor HP dalam berbagai format
 * @returns {string|null} Nomor HP format internasional (62xxx) atau null
 */
export function formatHP(noHP) {
  if (!noHP) return null;
  const clean = String(noHP).replace(/\D/g, '');
  if (clean.startsWith('0')) return '62' + clean.slice(1);
  if (clean.startsWith('62')) return clean;
  return '62' + clean;
}

/**
 * Generate random typing time untuk human-like feel.
 */
function getRandomTypingTime() {
  if (Math.random() > TYPING_CHANCE) return null;
  return Math.floor(Math.random() * (TYPING_TIME_MAX - TYPING_TIME_MIN + 1)) + TYPING_TIME_MIN;
}

/**
 * Should we skip country code? (5% chance - manusia kadang salah input)
 */
function shouldSkipCountryCode() {
  return Math.random() < COUNTRY_CODE_SKIP_CHANCE;
}

/**
 * Kirim pesan tunggal via Fonnte API dengan human-like behavior.
 *
 * @async
 * @param {string} nomorHP - Nomor HP tujuan (format 62xxx)
 * @param {string} pesan - Isi pesan WhatsApp
 * @param {Object} options - Opsi tambahan
 * @param {number} options.delay - Delay dalam detik (1-10, untuk multiple targets)
 * @param {boolean} options.typing - Typing indicator (auto-randomized if not set)
 * @returns {Promise<{status: boolean, message?: string, reason?: string, detail?: string, id?: string[]}>}
 */
export async function kirimPesanFonnte(nomorHP, pesan, options = {}) {
  const FOONTE_TOKEN = import.meta.env.VITE_FOONTE_TOKEN;

  if (!FOONTE_TOKEN) {
    console.warn('⚠️ VITE_FOONTE_TOKEN not set. Using mock mode.');
    return mockSend(nomorHP, pesan);
  }

  try {
    const formData = new URLSearchParams();
    formData.append('target', nomorHP);
    formData.append('message', pesan);

    // Auto-determine country code behavior
    const skipCountryCode = options.countryCode === '0' || shouldSkipCountryCode();
    if (!skipCountryCode) {
      formData.append('countryCode', '62');
    } else {
      formData.append('countryCode', '0');
    }

    // Delay: hanya works untuk multiple targets
    if (options.delay) {
      formData.append('delay', String(options.delay));
    }

    // Typing indicator
    const typingEnabled = options.typing !== undefined ? options.typing : (Math.random() < TYPING_CHANCE);
    if (typingEnabled) {
      formData.append('typing', 'true');
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FOONTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (data.status) {
      return {
        status: true,
        message: data.detail || 'Message Queued',
        id: data.id,
        requestid: data.requestid,
        typingEnabled: typingEnabled
      };
    } else {
      return {
        status: false,
        reason: data.reason || data.error || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      status: false,
      reason: `Network error: ${error.message}`
    };
  }
}

/**
 * Kirim pesan bulk via Fonnte API menggunakan parameter `data`.
 *
 *Ini lebih efisien karena 1 request untuk banyak pesan.
 *Delay ditangani server Fonnte.
 *
 * @async
 * @param {Array} messages - Array pesan [{target, message, delay}]
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.typing - Typing indicator (auto-randomized if not set)
 * @returns {Promise<{status: boolean, message?: string, reason?: string, details?: Array}>}
 *
 * @example
 * await kirimPesanBulkFonnte([
 *   { target: '628123456789', message: 'Halo Budi', delay: '2' },
 *   { target: '628987654321', message: 'Halo Siti', delay: '3' }
 * ]);
 */
export async function kirimPesanBulkFonnte(messages, options = {}) {
  const FOONTE_TOKEN = import.meta.env.VITE_FOONTE_TOKEN;

  if (!FOONTE_TOKEN) {
    console.warn('⚠️ VITE_FOONTE_TOKEN not set. Using mock mode.');
    return mockSendBulk(messages);
  }

  if (messages.length === 0) {
    return { status: true, message: 'No messages to send' };
  }

  // Jika hanya 1 pesan, tidak perlu bulk
  if (messages.length === 1) {
    return kirimPesanFonnte(messages[0].target, messages[0].message, { delay: messages[0].delay });
  }

  try {
    const formData = new URLSearchParams();

    // data parameter harus JSON string
    // delay format: '2' atau '1-10' untuk random
    formData.append('data', JSON.stringify(messages));

    // CountryCode default 62
    formData.append('countryCode', '62');

    // Typing indicator
    const typingEnabled = options.typing !== undefined ? options.typing : (Math.random() < TYPING_CHANCE);
    if (typingEnabled) {
      formData.append('typing', 'true');
    }

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FOONTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (data.status) {
      return {
        status: true,
        message: data.detail || 'Messages Queued',
        id: data.id,
        requestid: data.requestid,
        target: data.target
      };
    } else {
      return {
        status: false,
        reason: data.reason || data.error || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      status: false,
      reason: `Network error: ${error.message}`
    };
  }
}

// ============================================
// MOCK FUNCTIONS (untuk development)
// ============================================

async function mockSend(nomorHP, pesan) {
  console.log('\n' + '═'.repeat(60));
  console.log('📱 FOONTE - SINGLE SEND (MOCK)');
  console.log('─'.repeat(60));
  console.log(`📞 To: ${nomorHP}`);
  console.log(`💬 Message:\n${'─'.repeat(40)}`);
  console.log(pesan);
  console.log('═'.repeat(60) + '\n');

  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    status: true,
    message: 'Message Queued (Mock)',
    id: ['mock-id-' + Date.now()]
  };
}

async function mockSendBulk(messages) {
  console.log('\n' + '═'.repeat(60));
  console.log('📱 FOONTE - BULK SEND (MOCK)');
  console.log('─'.repeat(60));
  console.log(`📊 Total pesan: ${messages.length}`);
  console.log('─'.repeat(60));

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const delay = msg.delay || 2;
    console.log(`\n[${i + 1}/${messages.length}] 📞 ${msg.target}`);
    console.log(`   💬 ${msg.message.substring(0, 60)}${msg.message.length > 60 ? '...' : ''}`);
    if (i < messages.length - 1) {
      console.log(`   ⏱️  Delay ${delay}s...`);
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ ' + messages.length + ' messages queued (Mock)');
  console.log('═'.repeat(60) + '\n');

  return {
    status: true,
    message: messages.length + ' Messages Queued (Mock)',
    id: messages.map((_, i) => 'mock-id-' + i),
    target: messages.map(m => m.target)
  };
}

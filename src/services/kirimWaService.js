/**
 * @fileoverview Kirim WA Service
 *
 * Logika kirim batch notifikasi WhatsApp dengan:
 * - Fonnte single API per-pesan
 * - Human-like random delay dengan multiple patterns
 * - Template per kategori (NOMINEE, PENILAI, JURI)
 * - Placeholder personalisasi
 * - Variasi pesan untuk menghindari detection
 * - Waktu kirim yang natural
 * - Logging ke database per-pesan
 *
 * @module services/kirimWaService
 */

import { supabase } from '../config/supabaseClient';
import { formatHP } from './fonnteService';
import { kirimPesanLocalBot } from './wabotLokalService';
import { fetchTemplateWaAktif } from './templateWaService';

/**
 * ============================================
 * KONSTANTA - HUMAN-LIKE PATTERNS
 * ============================================
 */

// Delay patterns - manusia tidak kirim dengan interval yang sama
const NORMAL_DELAY_MIN = 3;      // Delay normal minimum (3 detik)
const NORMAL_DELAY_MAX = 8;      // Delay normal maximum (8 detik)
const SHORT_PAUSE_CHANCE = 0.15; // 15% chance untuk pause pendek (1-2 detik)
const LONG_PAUSE_CHANCE = 0.08; // 8% chance untuk pause panjang (15-45 detik)
const VERY_LONG_PAUSE_CHANCE = 0.03; // 3% chance untuk pause sangat panjang (1-3 menit)

const SHORT_PAUSE_MIN = 1;       // Pause pendek minimum
const SHORT_PAUSE_MAX = 2;       // Pause pendek maximum
const LONG_PAUSE_MIN = 15;       // Pause panjang minimum
const LONG_PAUSE_MAX = 45;       // Pause panjang maximum
const VERY_LONG_PAUSE_MIN = 60;  // Pause sangat panjang minimum (1 menit)
const VERY_LONG_PAUSE_MAX = 180; // Pause sangat panjang maximum (3 menit)

// Variasi jam kerja (dalam jam) - lebih natural di jam tertentu
const WORK_HOURS = {
  START: 8,   // Mulai jam kerja
  LUNCH_START: 12,
  LUNCH_END: 13,
  END: 21,    // Akhir jam kerja
};

// Batch pattern - hybrid small batch untuk lebih human-like
const BATCH_SIZES = [2, 3, 4, 5];
const SMALL_BATCH_CHANCE = 0.30; // 30% chance untuk batch kecil (2-3)
const NORMAL_BATCH_SIZE = 4;     // Default batch size

// Batch pause - jeda antar batch (simulasi "istirahat ngopi/nyamuk")
const BATCH_PAUSE_MIN = 45;  // 45 detik minimum antar batch
const BATCH_PAUSE_MAX = 120; // 120 detik (2 menit) maximum antar batch
const BATCH_PAUSE_CHANCE = 0.70; // 70% chance untuk pause antar batch

// Weekend batch pause lebih lama
const WEEKEND_BATCH_PAUSE_MULTIPLIER = 1.5;

/**
 * ============================================
 * VARIABEL STATE - untuk tracking pattern
 * ============================================
 */

// Track waktu kirim terakhir untuk natural interval
let lastSendTime = null;
let messageCount = 0;
let sessionStartTime = null;

/**
 * Reset state untuk sesi baru
 */
function resetHumanPatternState() {
  lastSendTime = Date.now();
  messageCount = 0;
  sessionStartTime = Date.now();
}

/**
 * Get random batch size - manusia kadang kirim 1-2, kadang 3-5
 * Tapi tidak selalu sama
 */
function getRandomBatchSize() {
  if (Math.random() < SMALL_BATCH_CHANCE) {
    // Batch kecil (2-3 pesan)
    return Math.random() < 0.5 ? 2 : 3;
  }
  // Batch normal (4-5 pesan)
  return Math.random() < 0.5 ? 4 : 5;
}

/**
 * Get random delay dengan multiple patterns untuk human-like behavior.
 *
 * Pattern manusia:
 * - 15% chance: pause pendek (1-2 detik) - "keburu"
 * - 72% chance: normal delay (3-8 detik) - typing speed normal
 * - 8% chance: long pause (15-45 detik) - "terganggu" sesuatu
 * - 3% chance: very long pause (1-3 menit) - "ke toilet"/meeting
 * - 2% chance: sangat cepat (< 1 detik) - "copy paste"
 */
function getRandomDelay() {
  const roll = Math.random();

  // Short pause (15%)
  if (roll < SHORT_PAUSE_CHANCE) {
    return {
      delay: Math.floor(Math.random() * (SHORT_PAUSE_MAX - SHORT_PAUSE_MIN + 1)) + SHORT_PAUSE_MIN,
      type: 'SHORT',
      reason: 'sepertinya buru-buru'
    };
  }

  // Very long pause (3%)
  if (roll < SHORT_PAUSE_CHANCE + VERY_LONG_PAUSE_CHANCE) {
    return {
      delay: Math.floor(Math.random() * (VERY_LONG_PAUSE_MAX - VERY_LONG_PAUSE_MIN + 1)) + VERY_LONG_PAUSE_MIN,
      type: 'VERY_LONG',
      reason: 'sedang sibuk/tidak bisa fokus'
    };
  }

  // Long pause (8%)
  if (roll < SHORT_PAUSE_CHANCE + VERY_LONG_PAUSE_CHANCE + LONG_PAUSE_CHANCE) {
    return {
      delay: Math.floor(Math.random() * (LONG_PAUSE_MAX - LONG_PAUSE_MIN + 1)) + LONG_PAUSE_MIN,
      type: 'LONG',
      reason: 'terganggu/sepertinya membaca pesan lain'
    };
  }

  // Normal delay (72%)
  return {
    delay: Math.floor(Math.random() * (NORMAL_DELAY_MAX - NORMAL_DELAY_MIN + 1)) + NORMAL_DELAY_MIN,
    type: 'NORMAL',
    reason: 'normal'
  };
}

/**
 * Check apakah jam saat ini termasuk jam kerja yang "aman"
 * untuk mengirim pesan tanpa terdeteksi bot.
 */
function isSafeHour() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Minggu, 6 = Sabtu

  // Weekend - jam lebih terbatas
  if (day === 0 || day === 6) {
    return hour >= 10 && hour <= 20;
  }

  // Weekday
  return hour >= WORK_HOURS.START && hour <= WORK_HOURS.END;
}

/**
 * Get delay berdasarkan waktu - manusia tidak kirim rata-rata
 */
function getContextualDelay(baseDelay) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Weekend - cenderung lebih santai
  if (day === 0 || day === 6) {
    return baseDelay * 1.5;
  }

  // Jam makan siang - orang lebih lambat respon
  if (hour >= WORK_HOURS.LUNCH_START && hour <= WORK_HOURS.LUNCH_END) {
    return baseDelay * 1.3;
  }

  // Jam awal kerja (8-9) - masih "warming up"
  if (hour >= WORK_HOURS.START && hour <= 9) {
    return baseDelay * 0.8;
  }

  // Jam sore menjelang pulang (17-18) - sudah lelah
  if (hour >= 17 && hour <= 18) {
    return baseDelay * 1.4;
  }

  return baseDelay;
}

/**
 * Get batch pause - jeda antar batch untuk simulasi "istirahat"
 * Manusia tidak kirim 50 pesan tanpa henti
 * Kadang ngopi, kadang nyamuk, kadang scrolling dulu
 */
function getBatchPause() {
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;

  let min = BATCH_PAUSE_MIN;
  let max = BATCH_PAUSE_MAX;

  // Weekend: batch pause lebih lama
  if (isWeekend) {
    min = Math.round(min * WEEKEND_BATCH_PAUSE_MULTIPLIER);
    max = Math.round(max * WEEKEND_BATCH_PAUSE_MULTIPLIER);
  }

  const pause = Math.floor(Math.random() * (max - min + 1)) + min;

  // Reason yang lebih natural
  const reasons = [
    'ngopi dulu â˜•',
    'nyamuk bentar ðŸ¦Ÿ',
    'scroll WA dulu ðŸ“±',
    'istirahat sebentar ðŸ’­',
    'respon chat lain ðŸ’¬',
    'makan siang ðŸ½ï¸',
    'ke toilet ðŸš½',
    'bertaubat bentar ðŸ¤²'
  ];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];

  return { pause, reason };
}

/**
 * Generate variansi kecil untuk pesan agar tidak identical.
 * Manusia kadang typo, kadang tambah spasi, dll.
 */
function addMessageVariation(baseMessage, recipientName) {
  // 10% chance untuk variasi kecil
  if (Math.random() > 0.10) return baseMessage;

  const variations = [
    // Tambah spasi extra
    (msg) => msg.replace('. ', '.  '),
    // Tambah tanda seru kecil
    (msg) => msg.replace('!', '!'),
    // Tambah emoji random (tidak selalu sama)
    (msg) => {
      const emojis = ['ðŸ‘‹', 'ðŸ“‹', 'âœ¨', 'ðŸ“Œ', 'ðŸŽ¯'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      return `${emoji} ${msg}`;
    },
    // Tambah "mohon" atau "silakan"
    (msg) => `Mohon maaf apabila mengganggu, ${msg.toLowerCase()}`,
    // Tambah perhatian khusus
    (msg) => msg.includes('Bapak')
      ? msg.replace('Bapak', 'Bapak Yth.')
      : msg.includes('Ibu')
        ? msg.replace('Ibu', 'Ibu Yth.')
        : msg,
  ];

  const variation = variations[Math.floor(Math.random() * variations.length)];
  return variation(baseMessage);
}

/**
 * Generate waktu kirim yang natural untuk logging.
 */
function getHumanReadableTime() {
  const now = new Date();
  return now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Mapping kategori ke nama peran
 */
export const PERAN_LABELS = {
  'NOMINEE': 'Nominee',
  'PENILAI': 'Penilai',
  'JURI': 'Juri',
};

/**
 * Deskripsi tugas per kategori
 */
const TUGAS_LABELS = {
  'NOMINEE': 'menulis narasi prestasi/inovasi',
  'PENILAI': 'memberikan skor kepada nominee',
  'JURI': 'menilai portofolio & bukti inovasi',
};

/**
 * Placeholder yang tersedia untuk template WA
 */
export const WA_PLACEHOLDERS = {
  NAMA: '[NAMA]',
  PANGGILAN: '[PANGGILAN]',
  LINK: '[LINK]',
  PERAN: '[PERAN]',
  NAMA_PERIODE: '[NAMA_PERIODE]',
  TANGGAL_MULAI: '[TANGGAL_MULAI]',
  TANGGAL_SELESAI: '[TANGGAL_SELESAI]',
};

/**
 * Generate pesan dari template dengan replacement placeholder.
 */
export function generatePesan(templateText, replacements) {
  let pesan = templateText;
  for (const [key, value] of Object.entries(replacements)) {
    pesan = pesan.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
    pesan = pesan.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return pesan;
}

/**
 * Hitung sapaan berdasarkan NIP baru.
 */
export function hitungSapaan(nama, nipBaru) {
  if (nipBaru && nipBaru.length >= 15) {
    const tahunLahir = parseInt(nipBaru.substring(0, 4), 10);
    const jenisKelamin = nipBaru.charAt(14);

    if (!isNaN(tahunLahir)) {
      const umur = new Date().getFullYear() - tahunLahir;
      if (umur < 28) return '';
      if (umur < 35) return (jenisKelamin === '1' ? 'Bang' : 'Kak');
      return (jenisKelamin === '1' ? 'Bapak' : 'Ibu');
    }
  }
  return '';
}

/**
 * Pilih template berdasarkan kategori.
 */
export function pilihTemplateByKategori(templates, kategori) {
  if (!templates || templates.length === 0) return null;

  const peranLabel = PERAN_LABELS[kategori] || kategori;

  // Cari template yang mengandung nama peran di judul
  const templateSpesifik = templates.find(t =>
    t.nama_tampilan.toLowerCase().includes(peranLabel.toLowerCase())
  );

  if (templateSpesifik) {
    console.log(`ðŸ“‹ Template untuk ${kategori}: "${templateSpesifik.nama_tampilan}"`);
    return templateSpesifik;
  }

  // Fallback: random
  const index = Math.floor(Math.random() * templates.length);
  console.log(`ðŸ“‹ Template random untuk ${kategori}: "${templates[index].nama_tampilan}"`);
  return templates[index];
}

/**
 * Format tanggal ke format Indonesia.
 */
function formatTanggal(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Kirim notifikasi WA ke banyak penerima.
 * Menggunakan Fonnte single API per-pesan dengan human-like delay.
 *
 * Pattern human-like:
 * - Variable delays (1 detik - 3 menit)
 * - Jam kerja aware
 * - Message variation
 * - Natural interval tracking
 * - Progress dengan context
 *
 * @async
 * @param {Object} options
 * @param {Array} options.penerimaList - Array { id, nama, nip_baru, no_hp, token_akses, token_id }
 * @param {string} options.kategori - 'NOMINEE', 'PENILAI', 'JURI'
 * @param {number} options.periodeId - ID periode
 * @param {string} options.rolePath - 'nominee', 'penilai', 'juri'
 * @param {Object} options.periodeData - { nama_periode, tgl_mulai, tgl_selesai }
 * @param {Function} options.onProgress - Callback progress
 * @param {Function} options.onComplete - Callback selesai
 * @returns {Promise<{berhasil: Array, gagal: Array}>}
 */
export async function kirimNotifikasiBatch({
  penerimaList,
  kategori,
  periodeId,
  rolePath,
  periodeData = {},
  onProgress,
  onComplete,
}) {
  if (!penerimaList || penerimaList.length === 0) {
    throw new Error('Daftar penerima kosong');
  }

  // Reset state untuk sesi baru
  resetHumanPatternState();

  // Check jam kerja
  const safeHour = isSafeHour();
  const currentTime = getHumanReadableTime();

  console.log('\n' + 'â•'.repeat(70));
  console.log('ðŸ“± MULAI KIRIM NOTIFIKASI WA (Hybrid Batch Mode)');
  console.log('â”€'.repeat(70));
  console.log(`ðŸ‘¥ Total penerima: ${penerimaList.length}`);
  console.log(`ðŸ·ï¸  Kategori: ${kategori}`);
  console.log(`ðŸ• Waktu mulai: ${currentTime}`);
  console.log(`â° Status jam: ${safeHour ? 'â±ï¸ Dalam jam kerja' : 'ðŸŒ™ Di luar jam kerja'}`);
  console.log('â”€'.repeat(70));
  console.log('ðŸ“Š Pattern Hybrid Batch:');
  console.log('   â€¢ Batch size: 2-5 pesan per batch (acak)');
  console.log('   â€¢ 70% â†’ pause 45-120 detik antar batch ("ngopi/nyamuk")');
  console.log('   â€¢ 30% â†’ langsung lanjut tanpa pause panjang');
  console.log('   â€¢ Weekend: batch pause 1.5x lebih lama');
  console.log('   â€¢ 15% â†’ delay pendek (1-2 detik) - "buru-buru"');
  console.log('   â€¢ 72% â†’ delay normal (3-8 detik) - typing normal');
  console.log('   â€¢ 8% â†’ pause panjang (15-45 detik) - "terganggu"');
  console.log('   â€¢ 3% â†’ pause sangat panjang (1-3 menit) - "sibuk"');
  console.log('   â€¢ 10% â†’ variasi pesan untuk menghindari identical messages');
  console.log('â•'.repeat(70) + '\n');

  const results = {
    berhasil: [],
    gagal: []
  };

  const baseUrl = window.location.origin;

  // Fetch templates
  const templates = await fetchTemplateWaAktif();

  if (templates.length === 0) {
    throw new Error('Tidak ada template WA yang aktif.');
  }

  // Pilih template
  const templateDipilih = pilihTemplateByKategori(templates, kategori);

  if (!templateDipilih) {
    throw new Error('Tidak ada template WA yang aktif');
  }

  console.log(`ðŸ“‹ Template: "${templateDipilih.nama_tampilan}"`);
  console.log(`ðŸ“‹ Template ID: ${templateDipilih.id}`);
  console.log('');

  // ========================================
  // HYBRID BATCH MODE - Kirim per batch 2-5 pesan
  // ========================================
  let i = 0;
  let batchNumber = 0;
  let batchStats = { batches: 0, avgBatchSize: 0 };

  while (i < penerimaList.length) {
    batchNumber++;
    const batchSize = getRandomBatchSize();
    const remaining = penerimaList.length - i;
    const actualBatchSize = Math.min(batchSize, remaining);

    batchStats.batches++;
    batchStats.avgBatchSize = (batchStats.avgBatchSize * (batchStats.batches - 1) + actualBatchSize) / batchStats.batches;

    console.log(`\n${'â”€'.repeat(70)}`);
    console.log(`ðŸ“¦ BATCH #${batchNumber} - ${actualBatchSize} pesan${actualBatchSize < batchSize ? ' (sisa ' + remaining + ')' : ''}`);
    console.log(`â”€`.repeat(70));

    // Proses pesan dalam batch ini
    for (let j = 0; j < actualBatchSize; j++) {
      const p = penerimaList[i];
      messageCount++;

      let link = '';
      if (kategori === 'PENILAI') {
        link = `${baseUrl}/penilai/${p.token_akses}`;
      } else if (kategori === 'JURI') {
        link = `${baseUrl}/juri?token=${p.token_akses}`;
      } else {
        // NOMINEE
        link = `${baseUrl}/nominee?token=${p.token_akses}`;
      }
      const panggilan = hitungSapaan(p.nama, p.nip_baru);
      const peran = PERAN_LABELS[kategori] || kategori;
      const tugas = TUGAS_LABELS[kategori] || '';

      let pesan = generatePesan(templateDipilih.isi_pesan, {
        NAMA: p.nama,
        PANGGILAN: panggilan,
        LINK: link,
        PERAN: peran,
        TUGAS: tugas,
        NAMA_PERIODE: periodeData?.nama_periode || '',
        TANGGAL_MULAI: formatTanggal(periodeData?.tgl_mulai),
        TANGGAL_SELESAI: formatTanggal(periodeData?.tgl_selesai),
      });

      // Tambah variasi pesan (10% chance)
      pesan = addMessageVariation(pesan, p.nama);

      // Format HP
      const noHpFormat = formatHP(p.no_hp);

      // Log ke database (pending)
      try {
        await supabase
          .from('log_notifikasi_wa')
          .insert({
            periode_id: periodeId,
            kategori: kategori,
            pegawai_id: p.id,
            token_id: p.token_id,
            template_id: templateDipilih.id,
            nomor_hp: noHpFormat,
            isi_pesan: pesan,
            status: 'PENDING'
          });
      } catch (err) {
        console.error('âš ï¸ Gagal insert log:', err);
      }

      // Progress: queued
      onProgress?.({
        index: i,
        total: penerimaList.length,
        status: 'SENDING',
        nama: p.nama,
        noHp: noHpFormat,
        batch: batchNumber,
        batchProgress: `${j + 1}/${actualBatchSize}`
      });

      // Get delay dengan context waktu
      const delayPattern = getRandomDelay();
      const contextualDelay = Math.round(getContextualDelay(delayPattern.delay));

      // Display human-readable delay info
      const timeIcon = delayPattern.type === 'SHORT' ? 'âš¡' :
                       delayPattern.type === 'LONG' ? 'â¸ï¸' :
                       delayPattern.type === 'VERY_LONG' ? 'â˜•' : 'â±ï¸';

      const reasonText = delayPattern.type === 'SHORT' ? 'keburu' :
                         delayPattern.type === 'LONG' ? 'terganggu' :
                         delayPattern.type === 'VERY_LONG' ? 'istirahat' : 'normal';

      if (delayPattern.type !== 'NORMAL' || contextualDelay > 5) {
        console.log(`  [${i + 1}/${penerimaList.length}] ${timeIcon} ${contextualDelay}d (${reasonText}) â†’ "${p.nama}"`);
      }

      // Tunda sebelum kirim
      await new Promise(resolve => setTimeout(resolve, contextualDelay * 1000));

      // Update last send time
      lastSendTime = Date.now();

      // Kirim via Local Bot API single message
      const response = await kirimPesanLocalBot(noHpFormat, pesan);

      if (response.status) {
        const sentTime = getHumanReadableTime();
        console.log(`  [${i + 1}/${penerimaList.length}] âœ… "${p.nama}" â†’ ${noHpFormat}`);

        results.berhasil.push(p);
        await updateLogStatus(periodeId, p.id, 'SENT');
        await updateStatusTerkirim(kategori, p.token_id);

        onProgress?.({
          index: i,
          total: penerimaList.length,
          status: 'SUCCESS',
          nama: p.nama,
          noHp: noHpFormat,
          batch: batchNumber,
          batchProgress: `${j + 1}/${actualBatchSize}`
        });
      } else {
        console.log(`  [${i + 1}/${penerimaList.length}] âŒ "${p.nama}" â†’ ${noHpFormat} (${response.reason})`);

        results.gagal.push({ ...p, error: response.reason });
        await updateLogStatus(periodeId, p.id, 'FAILED', response.reason);

        onProgress?.({
          index: i,
          total: penerimaList.length,
          status: 'FAILED',
          nama: p.nama,
          noHp: noHpFormat,
          error: response.reason,
          batch: batchNumber,
          batchProgress: `${j + 1}/${actualBatchSize}`
        });
      }

      i++;
    }

    // ========================================
    // BATCH PAUSE - Jeda antar batch
    // ========================================
    const remainingAfterBatch = penerimaList.length - i;
    if (remainingAfterBatch > 0) {
      // 70% chance untuk batch pause
      if (Math.random() < BATCH_PAUSE_CHANCE) {
        const { pause, reason } = getBatchPause();
        console.log(`\nâ˜• Batch #${batchNumber} selesai. ${reason} (~${pause}d)...`);
        console.log(`   ðŸ“Š Progress: ${i}/${penerimaList.length} | Sisa: ${remainingAfterBatch} pesan`);

        onProgress?.({
          index: i - 1,
          total: penerimaList.length,
          status: 'BATCH_PAUSE',
          batchNumber,
          batchSize: actualBatchSize,
          pauseDuration: pause,
          reason,
          remaining: remainingAfterBatch
        });

        await new Promise(resolve => setTimeout(resolve, pause * 1000));
      } else {
        // 30% chance langsung lanjut tanpa pause panjang
        const shortPause = Math.floor(Math.random() * 5) + 3;
        console.log(`\nâ­ï¸ Langsung lanjut ke batch berikutnya (pause ${shortPause}d)...`);
        await new Promise(resolve => setTimeout(resolve, shortPause * 1000));
      }
    }
  }

  // Summary dengan statistik human-like
  const endTime = new Date();
  const duration = Math.round((endTime - sessionStartTime) / 1000);
  const avgDelay = Math.round(duration / Math.max(penerimaList.length, 1));

  console.log('\n' + 'â•'.repeat(70));
  console.log('ðŸ“Š RINGKASAN PENGIRIMAN (Hybrid Batch Mode)');
  console.log('â”€'.repeat(70));
  console.log(`   âœ… Berhasil: ${results.berhasil.length}`);
  console.log(`   âŒ Gagal: ${results.gagal.length}`);
  console.log(`   ðŸ“¦ Total: ${penerimaList.length} pesan`);
  console.log(`   ðŸ“¦ Total batch: ${batchStats.batches}`);
  console.log(`   ðŸ“ˆ Rata-rata batch size: ${batchStats.avgBatchSize.toFixed(1)} pesan/batch`);
  console.log(`   â±ï¸  Durasi total: ${Math.floor(duration / 60)}m ${duration % 60}d`);
  console.log(`   ðŸ“ˆ Rata-rata delay: ${avgDelay} detik/pesan`);
  console.log(`   ðŸ• Waktu selesai: ${getHumanReadableTime()}`);
  console.log('â”€'.repeat(70));
  console.log('ðŸ’¡ Tips Anti-Ban:');
  console.log('   â€¢ Pattern batch (2-5 pesan) + pause (45-120 detik)');
  console.log('   â€¢ Simulasi manusia: ngopi, nyamuk, scroll WA');
  console.log('   â€¢ Weekend: batch pause lebih lama');
  console.log('   â€¢ Jangan kirim di jam yang sama setiap hari');
  console.log('â•'.repeat(70) + '\n');

  onComplete?.(results);
  return results;
}

/**
 * Update log status di database.
 */
async function updateLogStatus(periodeId, pegawaiId, status, errorMessage = null) {
  try {
    await supabase
      .from('log_notifikasi_wa')
      .update({
        status: status,
        sent_at: status === 'SENT' ? new Date().toISOString() : null,
        error_message: errorMessage
      })
      .eq('periode_id', periodeId)
      .eq('pegawai_id', pegawaiId)
      .eq('status', 'PENDING');
  } catch (err) {
    console.error('âš ï¸ Gagal update log:', err);
  }
}

/**
 * Update kolom notifikasi_wa_sent_at di tabel akses terkait.
 */
async function updateStatusTerkirim(kategori, tokenId) {
  const tableMap = {
    'NOMINEE': 'akses_nominee',
    'PENILAI': 'akses_penilai',
    'JURI': 'juri_periode'
  };

  const table = tableMap[kategori];
  if (!table) return;

  try {
    await supabase
      .from(table)
      .update({ notifikasi_wa_sent_at: new Date().toISOString() })
      .eq('id', tokenId);
  } catch (err) {
    console.error(`âš ï¸ Gagal update status terkirim untuk ${kategori}:`, err);
  }
}

/**
 * Filter list penerima yang belum mendapat notifikasi.
 */
export function filterBelumTerkirim(list, field = 'notifikasi_wa_sent_at') {
  return list.filter(item => !item[field]);
}
export async function toggleStatusTerkirim(kategori, tokenId, setSudah) {
  const tableMap = {
    'NOMINEE': 'akses_nominee',
    'PENILAI': 'akses_penilai',
    'JURI': 'juri_periode'
  };

  const table = tableMap[kategori];
  if (!table) throw new Error('Kategori tidak valid');

  const { error } = await supabase
    .from(table)
    .update({ notifikasi_wa_sent_at: setSudah ? new Date().toISOString() : null })
    .eq('id', tokenId);
    
  if (error) throw error;
}

export async function toggleStatusEmailTerkirim(kategori, tokenId, setSudah) {
  const tableMap = {
    'NOMINEE': 'akses_nominee',
    'PENILAI': 'akses_penilai',
    'JURI': 'juri_periode'
  };

  const table = tableMap[kategori];
  if (!table) throw new Error('Kategori tidak valid');

  const { error } = await supabase
    .from(table)
    .update({ notifikasi_email_sent_at: setSudah ? new Date().toISOString() : null })
    .eq('id', tokenId);
    
  if (error) throw error;
}

/**
 * Mencatat log pengiriman Email ke tabel log_notifikasi_email
 */
export async function insertLogEmail(periodeId, pegawaiId, kategori, emailTujuan, status, errorMessage = null) {
  try {
    await supabase.from('log_notifikasi_email').insert([{
      periode_id: periodeId,
      pegawai_id: pegawaiId,
      kategori: kategori,
      email_tujuan: emailTujuan,
      status: status,
      error_message: errorMessage,
      sent_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error('⚠️ Gagal insert log email:', err);
  }
}

/**
 * Mencatat klik WA.me ke tabel log_notifikasi_wa
 */
export async function insertLogWaMe(periodeId, pegawaiId, nomorTujuan, kategori = null) {
  try {
    await supabase.from('log_notifikasi_wa').insert([{
      periode_id: periodeId,
      pegawai_id: pegawaiId,
      kategori: kategori,
      nomor_hp: nomorTujuan,
      isi_pesan: 'Terkirim manual via WA.me',
      status: 'WA.ME',
      sent_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.error('⚠️ Gagal insert log wa.me:', err);
  }
}

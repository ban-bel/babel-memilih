/**
 * @fileoverview Halaman Perkenalan Nomor WA
 *
 * Fitur:
 * - Kirim pesan WA perkenalan nomor baru ke pegawai (bulk)
 * - Tombol Wa.Me untuk kirim pesan individual via web.whatsapp.com
 * - Pilih pegawai yang akan dikirimi
 * - Kirim bulk dengan hybrid batch pattern
 *
 * @module pages/admin/PerkenalanNomorWA
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Smartphone,
  Send,
  Users,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { formatHP } from '../../services/wabotLokalService';
import { insertLogWaMe } from '../../services/kirimWaService';
import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';

// =============================================================================
// KONSTANTA
// =============================================================================

const BATCH_SIZE = 10; // Max pesan per batch (lebih kecil = lebih aman)
const DELAY_BETWEEN_BATCH = 60; // Detik antar batch (lebih lama = lebih aman)

// Human-like delay patterns untuk hindari spam report
const DELAY_PATTERNS = {
  SHORT: { chance: 0.15, min: 1, max: 3 },   // 15% - cepat (buru-buru)
  NORMAL: { chance: 0.70, min: 4, max: 10 },  // 70% - normal
  LONG: { chance: 0.10, min: 15, max: 30 },   // 10% - lama (terganggu)
  VERY_LONG: { chance: 0.05, min: 45, max: 90 }, // 5% - sangat lama
};

// Variasi template untuk random
const TEMPLATE_VARIASI = [
  // Template 1: Original
  `Yth. [PANGGILAN] [NAMA],

Ini akun WhatsApp dari Rommel untuk kegiatan pemilihan pegawai pada babel-memilih.vercel.app.

📱 *Nomor Baru:*
[NOMOR_BARU]

⚠️ *Penting:*
• Jangan di-report spam ya, nanti nomornya hilang wkwkwkwk 😅
• Nomor ini digunakan untuk WA blasting informasi kegiatan penilaian
• Harap simpan dan gunakan nomor ini untuk komunikasi resmi
• Akses penilaian di: https://babel-memilih.vercel.app

Terima kasih atas perhatiannya.

Salam,
Admin Sistem Babel Memilih`,

  // Template 2: Formal
  `Yth. [PANGGILAN] [NAMA],

Bersama ini kami perkenalkan nomor WhatsApp baru dari Rommel yang digunakan untuk sistem penilaian pegawai BPS.

📱 *Nomor Baru:*
[NOMOR_BARU]

📌 *Kegunaan:*
• Komunikasi resmi terkait pemilihan pegawai berprestasi
• Notifikasi kegiatan penilaian

⚠️ Mohon untuk tidak melaporkan sebagai spam. Terima kasih atas kerjasamanya.

Salam,
Admin Sistem Babel Memilih`,

  // Template 3: Singkat
  `Yth. [PANGGILAN] [NAMA],

📱 Nomor baru dari Rommel untuk sistem penilaian pegawai:
[NOMOR_BARU]

Akses: https://babel-memilih.vercel.app

Mohon disimpan dan jangan di-report spam ya! Terima kasih 🙏

Salam,
Admin`,

  // Template 4: Casual
  `Halo [PANGGILAN] [NAMA]! 👋

Numor baru dari Rommel nih: [NOMOR_BARU]

Ini buat sistim penilaian pegawai di https://babel-memilih.vercel.app

Jgn di-report spam ya, ntar numornya ilang wkwkwk 😅

Makasih! 😊`,

  // Template 5: Formal Brief
  `Yth. [PANGGILAN] [NAMA],

Perkenalkan nomor WhatsApp baru dari Rommel untuk sistem penilaian pegawai BPS.

📱 [NOMOR_BARU]

Silakan simpan dan gunakan untuk komunikasi terkait penilaian pegawai.

Terima kasih.
Admin Babel Memilih`,
];

// Template default (untuk input user)
const DEFAULT_WA_PESAN = `Yth. [PANGGILAN] [NAMA],

Ini akun WhatsApp dari Rommel untuk kegiatan pemilihan pegawai pada babel-memilih.vercel.app.

📱 *Nomor Baru:*
[NOMOR_BARU]

⚠️ *Penting:*
• Jangan di-report spam ya, nanti nomornya hilang wkwkwkwk 😅
• Nomor ini digunakan untuk WA blasting informasi kegiatan penilaian
• Harap simpan dan gunakan nomor ini untuk komunikasi resmi
• Akses penilaian di: https://babel-memilih.vercel.app

Terima kasih atas perhatiannya.

Salam,
Admin Sistem Babel Memilih`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate random template from variations
 */
function getRandomTemplate() {
  return TEMPLATE_VARIASI[Math.floor(Math.random() * TEMPLATE_VARIASI.length)];
}

/**
 * Hitung sapaan berdasarkan NIP baru
 */
function hitungSapaan(nama, nipBaru) {
  if (nipBaru && nipBaru.length >= 15) {
    const tahunLahir = parseInt(nipBaru.substring(0, 4), 10);
    const jenisKelamin = nipBaru.charAt(14);

    if (!isNaN(tahunLahir)) {
      const umur = new Date().getFullYear() - tahunLahir;
      if (umur < 28) return '';
      if (umur < 35) return jenisKelamin === '1' ? 'Bang' : 'Kak';
      return jenisKelamin === '1' ? 'Bapak' : 'Ibu';
    }
  }
  return '';
}

/**
 * Generate random delay untuk human-like behavior
 */
function getRandomDelay() {
  const roll = Math.random();
  let cumulative = 0;

  for (const [type, config] of Object.entries(DELAY_PATTERNS)) {
    cumulative += config.chance;
    if (roll < cumulative) {
      return Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    }
  }

  // Fallback ke normal
  return Math.floor(Math.random() * (DELAY_PATTERNS.NORMAL.max - DELAY_PATTERNS.NORMAL.min + 1)) + DELAY_PATTERNS.NORMAL.min;
}

/**
 * Generate pesan dengan replacement
 */
function generatePesan(template, replacements) {
  let pesan = template;
  for (const [key, value] of Object.entries(replacements)) {
    pesan = pesan.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
  }
  return pesan;
}

/**
 * Fetch daftar pegawai aktif
 */
async function fetchDaftarPegawai() {
  const { data, error } = await supabase
    .from('pegawai')
    .select(`
      id,
      nama,
      nip,
      nip_baru,
      no_hp,
      email,
      foto_url,
      role_admin,
      is_kakan,
      is_active,
      wilayah:wilayah_id (
        id,
        nama_wilayah
      )
    `)
    .eq('is_active', true)
    .order('nama', { ascending: true });

  if (error) throw new Error(`Gagal mengambil data pegawai: ${error.message}`);
  return data ?? [];
}

// =============================================================================
// KOMPONEN UTAMA
// =============================================================================

function PerkenalanNomorWAContent({ adminProfile }) {
  // State
  const [kataKunci, setKataKunci] = useState('');
  const [nomorBaru, setNomorBaru] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);

  // State Wa.Me - Track sent status per employee ID
  const [waMeNomor, setWaMeNomor] = useState('');
  const [waMePesan, setWaMePesan] = useState(DEFAULT_WA_PESAN);
  const [selectedWaMe, setSelectedWaMe] = useState(null);
  const [sentWaMeIds, setSentWaMeIds] = useState(new Set()); // Track IDs yang sudah terkirim via Wa.Me

  // Helper: Generate URL Wa.Me
  function generateWaMeUrl(nomorHP, pesan) {
    if (!nomorHP) return '';
    const noHp = formatHP(nomorHP);
    const encodedPesan = encodeURIComponent(pesan);
    return `https://wa.me/${noHp}?text=${encodedPesan}`;
  }

  // Helper: Preview Wa.Me link
  const getWaMePreview = useCallback(() => {
    if (!waMeNomor) return '';
    return generateWaMeUrl(waMeNomor, waMePesan);
  }, [waMeNomor, waMePesan]);

  // Handle Kirim via Wa.Me - Random template + mark as sent
  function handleKirimWaMe(pegawai) {
    if (!nomorBaru) {
      toast.error('Masukkan nomor WA baru terlebih dahulu!');
      return;
    }

    // Generate random template dan replacements
    const randomTemplate = getRandomTemplate();
    const panggilan = hitungSapaan(pegawai.nama, pegawai.nip_baru);
    const pesan = generatePesan(randomTemplate, {
      NAMA: pegawai.nama,
      PANGGILAN: panggilan,
      NOMOR_BARU: nomorBaru,
    });

    // Generate URL dan buka WhatsApp Web
    const url = generateWaMeUrl(pegawai.no_hp, pesan);
    window.open(url, '_blank');

    // Tandai sebagai terkirim
    setSentWaMeIds(prev => new Set([...prev, pegawai.id]));
    insertLogWaMe(null, pegawai.id, pegawai.no_hp, 'PERKENALAN');
    toast.success(`Pesan untuk ${pegawai.nama} siap dikirim via WhatsApp Web!`);
  }

  // Fetch pegawai
  const { data: pegawaiList = [], isLoading, refetch } = useQuery({
    queryKey: ['perkenalan-pegawai'],
    queryFn: fetchDaftarPegawai,
  });

  // Filter berdasarkan kata kunci
  const filteredPegawai = useMemo(() => {
    if (!kataKunci) return pegawaiList;
    const lower = kataKunci.toLowerCase();
    return pegawaiList.filter(p =>
      p.nama?.toLowerCase().includes(lower) ||
      p.nip?.toLowerCase().includes(lower) ||
      p.nip_baru?.toLowerCase().includes(lower) ||
      p.no_hp?.toLowerCase().includes(lower)
    );
  }, [pegawaiList, kataKunci]);

  // Statistik
  const stats = useMemo(() => {
    const total = pegawaiList.length;
    const withHP = pegawaiList.filter(p => p.no_hp).length;
    const selected = selectedIds.size;
    const sentWaMe = sentWaMeIds.size;
    return { total, withHP, selected, sentWaMe };
  }, [pegawaiList, selectedIds, sentWaMeIds]);

  // Toggle select all - hanya yang belum terkirim via Wa.Me
  function toggleSelectAll() {
    const selectableIds = filteredPegawai
      .filter(p => p.no_hp && !sentWaMeIds.has(p.id))
      .map(p => p.id);

    const allSelected = selectableIds.every(id => selectedIds.has(id));

    if (allSelected) {
      // Hapus semua selectable dari selection
      const newSet = new Set(selectedIds);
      selectableIds.forEach(id => newSet.delete(id));
      setSelectedIds(newSet);
    } else {
      // Pilih semua yang belum terpilih
      const newSet = new Set(selectedIds);
      selectableIds.forEach(id => newSet.add(id));
      setSelectedIds(newSet);
    }
  }

  // Toggle select one
  function toggleSelect(id) {
    if (sentWaMeIds.has(id)) return; // Jangan bisa pilih yang sudah terkirim
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  // Kirim pesan
  async function handleKirim() {
    if (!nomorBaru) {
      toast.error('Masukkan nomor WA baru terlebih dahulu!');
      return;
    }

    if (selectedIds.size === 0) {
      toast.error('Pilih minimal 1 pegawai!');
      return;
    }

    const selectedPegawai = pegawaiList.filter(p => selectedIds.has(p.id));
    const withHP = selectedPegawai.filter(p => p.no_hp);

    if (withHP.length === 0) {
      toast.error('Tidak ada pegawai dengan nomor HP yang valid!');
      return;
    }

    // Konfirmasi dengan info anti-ban
    const konfirmasi = window.confirm(
      `Kirim pesan ke ${withHP.length} pegawai?\n\n` +
      `📊 Pattern Anti-Spam:\n` +
      `• Batch kecil (10 pesan/batch)\n` +
      `• Delay acak (1-90 detik)\n` +
      `• Variasi pesan per recipient\n` +
      `• Est. waktu: ~${Math.ceil(withHP.length * 0.3 / 60)}-${Math.ceil(withHP.length * 1 / 60)} menit\n\n` +
      `⚠️ Jangan tutup browser selama proses!`
    );

    if (!konfirmasi) return;

    setIsSending(true);
    setSendProgress({ sent: 0, total: withHP.length, failed: 0 });

    try {
      // Generate pesan per recipient dengan random template
      const messages = withHP.map(p => {
        const noHp = formatHP(p.no_hp);
        const panggilan = hitungSapaan(p.nama, p.nip_baru);

        // Use random template for each message
        const randomTemplate = getRandomTemplate();
        const pesan = generatePesan(randomTemplate, {
          NAMA: p.nama,
          PANGGILAN: panggilan,
          NOMOR_BARU: nomorBaru,
        });

        return {
          target: noHp,
          message: pesan,
          delay: '2',
        };
      });

      // Kirim per batch dengan delay acak
      let sent = 0;
      let failed = 0;

      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(messages.length / BATCH_SIZE);

        console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} pesan)...`);

        try {
          const result = await kirimPesanBulkFonnte(batch);

          if (result.status) {
            sent += batch.length;
          } else {
            if (result.target && Array.isArray(result.target)) {
              sent += result.target.length;
              failed += batch.length - result.target.length;
            } else {
              failed += batch.length;
            }
            console.warn('Batch warning:', result.reason);
          }
        } catch (err) {
          console.error(`Batch ${batchNum} failed:`, err);
          failed += batch.length;
        }

        setSendProgress({ sent, failed, total: withHP.length });

        // Delay antar batch (HUMAN-LIKE - acak, tidak selalu sama)
        if (i + BATCH_SIZE < messages.length) {
          const randomDelay = getRandomDelay();
          console.log(`⏳ Human-like pause: ${randomDelay} detik...`);
          await new Promise(resolve => setTimeout(resolve, randomDelay * 1000));
        }
      }

      setSendProgress({ sent, failed, total: withHP.length, complete: true });

      toast.success(
        `Berhasil mengirim ${sent} pesan${failed > 0 ? `, ${failed} gagal` : ''}`
      );

    } catch (err) {
      console.error('Send error:', err);
      toast.error(`Gagal mengirim: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  }

  // Preview pesan - gunakan random template
  const previewPesan = useMemo(() => {
    if (!nomorBaru) return '';
    const samplePegawai = filteredPegawai.find(p => p.no_hp) || filteredPegawai[0];
    if (!samplePegawai) return '';

    const randomTemplate = getRandomTemplate();
    return generatePesan(randomTemplate, {
      NAMA: samplePegawai.nama,
      PANGGILAN: hitungSapaan(samplePegawai.nama, samplePegawai.nip_baru),
      NOMOR_BARU: nomorBaru,
    });
  }, [nomorBaru, filteredPegawai]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">
            📱 Perkenalan Nomor WA
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kirim pesan perkenalan nomor WhatsApp baru ke pegawai
          </p>
        </div>
      </div>

      {/* Warning Box - Opsi Cara Kirim */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 text-2xl">💡</div>
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-2">Pilih Cara Kirim:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium">🚀 Fonnte API:</span>
                <span>Kirim cepat langsung dari server. Risiko banned lebih tinggi karena location mismatch.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium">📱 WhatsApp Lokal (Baileys):</span>
                <span>Lebih aman! Pesan dikirim dari HP kamu sendiri (location match). Jalankan <code className="bg-amber-100 px-1 rounded">cd src-bot && npm run dev</code></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Nomor Baru */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-800 mb-4">
          <Smartphone className="h-5 w-5 text-gold-500" />
          Masukkan Nomor WhatsApp Baru
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nomor WhatsApp Baru
            </label>
            <input
              type="text"
              value={nomorBaru}
              onChange={(e) => setNomorBaru(e.target.value)}
              placeholder="Contoh: 6281234567890 atau 081234567890"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Format: Bisa dengan atau tanpa kode negara (62xxx atau 08xxx)
            </p>
          </div>

          {nomorBaru && (
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-slate-700">
                  Preview Pesan
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-slate-600 font-sans">
                {previewPesan}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* WA.ME SECTION - Kirim pesan individual via web.whatsapp.com */}
      {/* ============================================ */}
      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-green-800 mb-4">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Wa.Me - Kirim via WhatsApp Web
        </h2>
        <p className="text-sm text-green-700 mb-4">
          Buka WhatsApp Web dengan pesan yang sudah terisi. Cocok untuk kirim pesan individual atau percakapan awal dengan nomor bot (Rommel).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Input Nomor Tujuan */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nomor Tujuan
            </label>
            <input
              type="text"
              value={waMeNomor}
              onChange={(e) => setWaMeNomor(e.target.value)}
              placeholder="Contoh: 6281234567890"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Nomor yang akan dikirimi pesan via Wa.Me
            </p>
          </div>

          {/* Input Pesan */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Isi Pesan
            </label>
            <input
              type="text"
              value={waMePesan}
              onChange={(e) => setWaMePesan(e.target.value)}
              placeholder="Ketik pesan yang ingin dikirim..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
            />
            <p className="mt-1 text-xs text-slate-400">
              Pesan default: "Halo ini Rommel, nomor ini buat sistem pemilihan pegawai https://babel-memilih.vercel.app. Jangan di-report spam ya, nanti nomornya hilang wkwkwkwk 😅"
            </p>
          </div>
        </div>

        {/* Preview URL */}
        {waMeNomor && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Preview URL:
            </label>
            <code className="block bg-slate-100 rounded-lg p-2 text-xs text-slate-600 break-all">
              {getWaMePreview()}
            </code>
          </div>
        )}

        {/* Tombol Wa.Me */}
        <div className="flex flex-wrap gap-3">
          <a
            href={getWaMePreview()}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all ${
              !waMeNomor
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-600/25 hover:shadow-xl hover:scale-[1.02]'
            }`}
            onClick={(e) => {
              if (!waMeNomor) {
                e.preventDefault();
                toast.error('Masukkan nomor tujuan terlebih dahulu!');
              }
            }}
          >
            <MessageCircle className="h-5 w-5" />
            Buka WhatsApp Web
            <ExternalLink className="h-4 w-4" />
          </a>

          <button
            onClick={() => {
              if (!waMeNomor) {
                toast.error('Masukkan nomor tujuan terlebih dahulu!');
                return;
              }
              navigator.clipboard.writeText(getWaMePreview());
              toast.success('Link Wa.Me berhasil disalin!');
            }}
            disabled={!waMeNomor}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.withHP}</p>
              <p className="text-xs text-slate-500">Punya HP</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.sentWaMe}</p>
              <p className="text-xs text-slate-500">Via Wa.Me</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gold-700">{stats.selected}</p>
              <p className="text-xs text-slate-500">Dipilih</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Kirim */}
      {sendProgress && (
        <div className={`rounded-xl border p-4 ${sendProgress.complete ? 'border-green-200 bg-green-50' : 'border-navy-200 bg-navy-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {sendProgress.complete ? '✅ Pengiriman Selesai' : '📤 Mengirim pesan...'}
            </span>
            <span className="text-sm text-slate-600">
              {sendProgress.sent}/{sendProgress.total}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-navy-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }}
            />
          </div>
          {sendProgress.failed > 0 && (
            <p className="mt-2 text-xs text-red-600">
              ⚠️ {sendProgress.failed} pesan gagal dikirim
            </p>
          )}
        </div>
      )}

      {/* Tombol Kirim via Fonnte */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleKirim}
          disabled={isSending || !nomorBaru || selectedIds.size === 0}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all ${
            isSending || !nomorBaru || selectedIds.size === 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/25 hover:shadow-xl hover:scale-[1.02]'
          }`}
        >
          {isSending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Mengirim via Fonnte...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Kirim via Fonnte ({selectedIds.size})
            </>
          )}
        </button>

        {!isSending && selectedIds.size > 0 && (
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Batal Pilih
          </button>
        )}
      </div>

      {/* Tabel Pegawai */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        {/* Header Tabel */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4">
          <h2 className="font-semibold text-navy-800">
            Daftar Pegawai ({filteredPegawai.length})
          </h2>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                placeholder="Cari nama, NIP, HP..."
                className="pl-9 pr-4 py-2 w-64 rounded-xl border border-slate-200 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Select All */}
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-2">
          {(() => {
            const selectableIds = filteredPegawai
              .filter(p => p.no_hp && !sentWaMeIds.has(p.id))
              .map(p => p.id);
            const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id));
            const selectableCount = selectableIds.length;

            return (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={selectableCount === 0}
                  className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500 disabled:opacity-50"
                />
                <span className="text-sm font-medium text-slate-700">
                  Pilih Semua ({selectableCount} bisa dipilih)
                </span>
                {sentWaMeIds.size > 0 && (
                  <span className="text-xs text-blue-600">
                    ({sentWaMeIds.size} sudah terkirim)
                  </span>
                )}
              </label>
            );
          })()}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <span className="sr-only">Pilih</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pegawai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unit Kerja
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    No. HP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPegawai.map((p) => {
                  const hasHP = Boolean(p.no_hp);
                  const isSelected = selectedIds.has(p.id);
                  const isSentWaMe = sentWaMeIds.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-navy-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          disabled={!hasHP || isSentWaMe}
                          className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama || 'P')}&background=16324a&color=fff&size=64`}
                            alt={p.nama}
                            className="h-10 w-10 rounded-full object-cover border border-slate-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama || 'P')}&background=16324a&color=fff&size=64`;
                            }}
                          />
                          <div>
                            <p className="font-medium text-slate-900">{p.nama}</p>
                            <p className="text-xs text-slate-500">
                              {p.nip_baru || p.nip || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {p.wilayah?.nama_wilayah || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${hasHP ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                          {hasHP ? formatHP(p.no_hp) : 'Tidak ada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isSentWaMe ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <CheckCircle className="h-3 w-3" />
                            Terkirim
                          </span>
                        ) : hasHP ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Siap Kirim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            <XCircle className="h-3 w-3" />
                            Tanpa HP
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasHP && !isSentWaMe ? (
                          <button
                            onClick={() => handleKirimWaMe(p)}
                            title="Kirim via WhatsApp Web"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        ) : hasHP && isSentWaMe ? (
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 text-blue-400">
                            <CheckCircle className="h-4 w-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-8 w-8 text-slate-300">
                            <MessageCircle className="h-4 w-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredPegawai.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-slate-300" />
                        <p className="text-slate-500">Tidak ada pegawai ditemukan</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-green-200 bg-green-50/50 p-4">
        <div className="flex gap-3">
          <div className="text-xl">📱</div>
          <div className="text-sm text-green-800">
            <p className="font-semibold mb-2">Opsi Aman - WhatsApp Lokal (Baileys):</p>
            <p className="mb-2">Untuk pengiriman yang lebih aman (location match = tidak banned), gunakan WhatsApp Bot lokal:</p>
            <div className="bg-green-100/50 rounded-lg p-3 font-mono text-xs">
              <p># Masuk ke folder bot</p>
              <p>cd src-bot</p>
              <p className="mt-1"># Install & jalankan</p>
              <p>npm install</p>
              <p>npm run dev</p>
              <p className="mt-1"># Scan QR dengan WhatsApp</p>
            </div>
            <p className="mt-2 text-xs text-green-600">Bot akan mengambil data recipient yang belum terkirim dari database secara otomatis.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// WRAPPER
// =============================================================================

export default function PerkenalanNomorWA() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <PerkenalanNomorWAContent adminProfile={adminProfile} />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

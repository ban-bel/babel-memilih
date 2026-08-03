/**
 * @fileoverview Komponen halaman manajemen partisipan dan token akses.
 *
 * Halaman ini menampilkan daftar Nominee, Penilai, dan Juri yang участвуют
 * dalam suatu periode penilaian. Admin dapat:
 * - Melihat status submissi tiap partisipan
 * - Mengcopy link token akses
 * - Mengirim notifikasi via WhatsApp (bulk dengan progress)
 * - Generate token massal
 *
 * @module pages/admin/PartisipanPeriode
 * @requires react
 * @requires @tanstack/react-query
 * @requires lucide-react
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Copy,
  CheckCircle2,
  RefreshCw,
  Loader2,
  MessageCircle,
  Send,
  Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchDaftarNomineeLengkap,
  fetchDaftarPenilaiLengkap,
  fetchDaftarJuriLengkap,
  generateTokenPenilaianMassal
} from '../../services/adminService';
import { kirimNotifikasiBatch, filterBelumTerkirim, generatePesan, pilihTemplateByKategori, PERAN_LABELS } from '../../services/kirimWaService';
import { fetchTemplateWaAktif } from '../../services/templateWaService';
import { formatHP } from '../../services/fonnteService';
import { kirimPesanLocalBot } from '../../services/wabotLokalService';
import ModalProgressKirim from '../../components/common/ModalProgressKirim';
import { MODE_PENILAIAN } from '../../utils/constants';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format tanggal ke format Indonesia.
 */
function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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
      if (umur < 28) return ''; // tidak ada sapaan (masih muda banget)
      if (umur < 35) return jenisKelamin === '1' ? 'Bang' : 'Kak';
      return jenisKelamin === '1' ? 'Bapak' : 'Ibu';
    }
  }
  return ''; // fallback kosong
}

// =============================================================================
// SUB-KOMPONEN
// =============================================================================

/**
 * TabButton - Komponen tab minimalis
 */
function TabButton({ label, active, onClick, count, dotColor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'relative px-4 py-2 text-sm font-semibold transition-all ' +
        (active
          ? 'text-navy-900 border-b-2 border-navy-700'
          : 'text-slate-400 hover:text-slate-600')
      }
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        {label}
        {count !== undefined && (
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {count}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * PartisipanRow - Baris tabel untuk satu partisipan
 */
function PartisipanRow({ item, activeTab, copiedId, onCopy, onToggleWaStatus, periode, templates }) {
  const [isSending, setIsSending] = useState(false);
  const p = item.nominee || item.pegawai;
  if (!p) return null;

  const isKetua = item.is_ketua_juri;
  const sudah = item.is_digunakan;
  const sudahNotif = !!item.notifikasi_wa_sent_at;
  const hp = formatHP(p.no_hp);

  // Generate WA link dengan pesan dinamis dari Supabase
  let linkToken = '';
  if (activeTab === 'nominee') {
    linkToken = `${window.location.origin}/nominee?token=${item.token_akses}`;
  } else if (activeTab === 'juri') {
    linkToken = `${window.location.origin}/juri?token=${item.token_akses}`;
  } else if (activeTab === 'penilai') {
    linkToken = `${window.location.origin}/penilai/${item.token_akses}`;
  }

  const kategoriLabel = activeTab.toUpperCase(); // 'NOMINEE', 'PENILAI', 'JURI'
  
  let waText = '';
  const templateText = pilihTemplateByKategori(templates, kategoriLabel);
  
  if (templateText && templateText.isi_pesan) {
    const sapaan = hitungSapaan(p.nama, p.nip_baru);
    waText = generatePesan(templateText.isi_pesan, {
      'NAMA': p.nama,
      'PANGGILAN': sapaan ? sapaan.trim() + ' ' : '',
      'LINK': linkToken,
      'NAMA_PERIODE': periode?.nama_periode || '',
      'PERAN': PERAN_LABELS[kategoriLabel] || kategoriLabel
    });
  } else {
    // Fallback jika tidak ada template
    waText = `Halo ${p.nama},\n\nBerikut adalah link akses Anda untuk Penilaian Pegawai (${periode?.nama_periode || ''}):\n${linkToken}\n\nMohon untuk tidak membagikan link ini kepada siapapun.\nTerima kasih.`;
  }

  const waHref = hp ? `https://wa.me/${hp}?text=${encodeURIComponent(waText)}` : '#';

  return (
    <tr className="table-row">
      {/* Nama & Unit Kerja */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={p.foto_url || (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null)}
            alt={p.nama}
            className="h-9 w-9 rounded-full object-cover border border-slate-200"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama || 'N')}&background=16324a&color=fff&size=64`;
            }}
          />
          <div>
            <p className="font-medium text-slate-900">{p.nama}</p>
            <p className="text-xs text-slate-500">{p.unit_kerja}</p>
          </div>
        </div>
      </td>

      {/* HP */}
      <td className="px-4 py-3">
        {hp ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (!sudahNotif) {
                onToggleWaStatus(item.id, true);
              }
            }}
            className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-emerald-600 hover:underline"
            title="Chat via WhatsApp dengan Template"
          >
            {p.no_hp}
          </a>
        ) : (
          <span className="text-xs text-red-400">Belum ada HP</span>
        )}
      </td>

      {/* Peran (hanya Juri) */}
      {activeTab === 'juri' && (
        <td className="px-4 py-3">
          <span
            className={
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
              (isKetua ? 'bg-gold-100 text-gold-700' : 'bg-slate-100 text-slate-600')
            }
          >
            {isKetua ? 'Ketua' : 'Anggota'}
          </span>
        </td>
      )}

      {/* Status Notifikasi */}
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onToggleWaStatus(item.id, !sudahNotif)}
          className={
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all hover:scale-105 ' +
            (sudahNotif ? 'bg-emerald-100 text-emerald-700 hover:bg-slate-100 hover:text-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700')
          }
          title={sudahNotif ? 'Klik untuk tandai belum terkirim' : 'Klik untuk tandai sudah terkirim'}
        >
          {sudahNotif ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terkirim
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Belum
            </>
          )}
        </button>
      </td>

      {/* Status Submit */}
      <td className="px-4 py-3">
        <span
          className={
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' +
            (sudah ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')
          }
        >
          {sudah ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Submitted
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Belum
            </>
          )}
        </span>
      </td>

      {/* Aksi */}
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onCopy(item.token_akses, item.id)}
            className={
              'btn-secondary text-xs ' +
              (copiedId === item.id ? 'border-emerald-300 text-emerald-700' : '')
            }
          >
            {copiedId === item.id ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Salin Link
              </>
            )}
          </button>

          {hp && (
            <>
              <button
                type="button"
                disabled={isSending}
                onClick={async () => {
                  setIsSending(true);
                  const hpFormat = formatHP(hp);
                  try {
                    const result = await kirimPesanLocalBot(hpFormat, waText);
                    if (result.status) {
                      toast.success(`Berhasil mengirim ke ${p.nama} via Bot`);
                      if (!sudahNotif) onToggleWaStatus(item.id, true);
                    } else {
                      toast.error(`Gagal: ${result.reason}`);
                    }
                  } catch (err) {
                    toast.error(`Error: ${err.message}`);
                  } finally {
                    setIsSending(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
                title="Kirim otomatis lewat WA Bot Lokal"
              >
                {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Kirim Bot
              </button>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!sudahNotif) {
                    onToggleWaStatus(item.id, true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                title="Kirim via WhatsApp Web (Template Otomatis)"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Kirim WA
              </a>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * TabelPartisipan
 */
function TabelPartisipan({ daftar, tab, copiedId, onCopy, onToggleWaStatus, periode, templates }) {
  if (!daftar || daftar.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400">
        Belum ada data.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="table-header">
          <tr>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">No. HP</th>
            {tab === 'juri' && <th className="px-4 py-3">Peran</th>}
            <th className="px-4 py-3">WA</th>
            <th className="px-4 py-3">Submit</th>
            <th className="px-4 py-3">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {daftar.map((item) => (
            <PartisipanRow
              key={item.id}
              item={item}
              activeTab={tab}
              copiedId={copiedId}
              onCopy={onCopy}
              onToggleWaStatus={onToggleWaStatus}
              periode={periode}
              templates={templates}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PartisipanPeriodeContent({ adminProfile, periode }) {
  const queryClient = useQueryClient();

  // State
  const [cari, setCari] = useState('');
  const [tab, setTab] = useState('nominee');
  const [terpilih, setTerpilih] = useState(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [kirimProgress, setKirimProgress] = useState({
    sent: 0,
    failed: 0,
    total: 0,
    logs: []
  });
  const [sedangMengirim, setSedangMengirim] = useState(false);

  // Fetch data partisipan
  const { data: daftarNominee = [], isLoading: loadingNominee } = useQuery({
    queryKey: ['partisipan-nominee', periode?.id],
    queryFn: () => fetchDaftarNomineeLengkap(periode.id),
    enabled: !!periode?.id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['template-wa-aktif'],
    queryFn: fetchTemplateWaAktif,
  });

  const { data: daftarPenilai = [], isLoading: loadingPenilai } = useQuery({
    queryKey: ['partisipan-penilai', periode?.id],
    queryFn: () => fetchDaftarPenilaiLengkap(periode.id),
    enabled: !!periode?.id,
  });

  const { data: daftarJuri = [], isLoading: loadingJuri } = useQuery({
    queryKey: ['partisipan-juri', periode?.id],
    queryFn: () => fetchDaftarJuriLengkap(periode.id),
    enabled: !!periode?.id,
  });

  // Mutation untuk generate token
  const generateMut = useMutation({
    mutationFn: () => generateTokenPenilaianMassal(periode.id, periode.wilayah_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partisipan-nominee', periode?.id] });
      queryClient.invalidateQueries({ queryKey: ['partisipan-penilai', periode?.id] });
      toast.success('Token berhasil di-generate');
    },
    onError: (err) => toast.error(err.message),
  });

  // Mutation untuk toggle status WA
  const toggleWaMut = useMutation({
    mutationFn: ({ tokenId, setSudah }) => {
      const currentTabConfig = availableTabs.find(t => t.key === tab) || availableTabs[0];
      return toggleStatusTerkirim(currentTabConfig.kategori, tokenId, setSudah);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`partisipan-${tab}`, periode?.id] });
      toast.success('Status WhatsApp diperbarui');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggleWa = (tokenId, setSudah) => {
    toggleWaMut.mutate({ tokenId, setSudah });
  };

  // Tab configuration
  const availableTabs = [
    { key: 'nominee', data: daftarNominee, label: 'Nominee', dotColor: 'bg-emerald-500', kategori: 'NOMINEE', rolePath: 'nominee' },
    { key: 'penilai', data: daftarPenilai, label: 'Penilai', dotColor: 'bg-blue-500', kategori: 'PENILAI', rolePath: 'penilai' },
    ...(periode?.mode_penilaian === MODE_PENILAIAN.MODE_2
      ? [{ key: 'juri', data: daftarJuri, label: 'Juri', dotColor: 'bg-amber-500', kategori: 'JURI', rolePath: 'juri' }]
      : []),
  ].filter(t => t.data.length > 0);

  // Auto-select tab if current tab has no data
  useEffect(() => {
    if (!availableTabs.find(t => t.key === tab)) {
      setTab(availableTabs[0]?.key || 'nominee');
    }
  }, [availableTabs, tab]);

  // Get current tab config
  const currentTabConfig = availableTabs.find(t => t.key === tab) || availableTabs[0];

  /**
   * Salin link token ke clipboard
   */
  function salin(token, id) {
    let linkToken = '';
    if (tab === 'nominee') {
      linkToken = `${window.location.origin}/nominee?token=${token}`;
    } else if (tab === 'juri') {
      linkToken = `${window.location.origin}/juri?token=${token}`;
    } else if (tab === 'penilai') {
      linkToken = `${window.location.origin}/penilai/${token}`;
    }
    
    navigator.clipboard.writeText(linkToken);
    setTerpilih(id);
    setTimeout(() => setTerpilih(null), 2000);
    toast.success('Link berhasil disalin');
  }

  /**
   * Handle Kirim Bulk WA
   */
  const handleKirimBulkWA = useCallback(async () => {
    if (!currentTabConfig) return;

    const currentList = tab === 'nominee' ? daftarNominee : tab === 'penilai' ? daftarPenilai : daftarJuri;

    // Filter yang belum dapat notifikasi dan punya HP
    const belumTerKirim = filterBelumTerkirim(currentList);

    // Filter yang punya HP
    const denganHP = belumTerKirim.filter(item => {
      const p = item.nominee || item.pegawai;
      return p?.no_hp;
    });

    if (denganHP.length === 0) {
      toast.error('Tidak ada penerima yang belum mendapat notifikasi atau belum punya nomor HP');
      return;
    }

    // Konfirmasi
    const konfirmasi = window.confirm(
      `Kirim notifikasi WA ke ${denganHP.length} ${currentTabConfig.label.toLowerCase()} yang belum mendapat notifikasi?\n\n` +
      `Pesan akan dipilih secara random dari template yang aktif.\n` +
      `Jeda 11-18 detik antar pesan untuk menghindari banned.`
    );

    if (!konfirmasi) return;

    // Reset progress state
    setKirimProgress({
      sent: 0,
      failed: 0,
      total: denganHP.length,
      logs: []
    });
    setIsProgressOpen(true);
    setSedangMengirim(true);

    // Prepare penerima list
    const penerimaList = denganHP.map(item => {
      const p = item.nominee || item.pegawai;
      return {
        id: p.id,
        nama: p.nama,
        nip_baru: p.nip_baru,
        no_hp: formatHP(p.no_hp),
        token_akses: item.token_akses,
        token_id: item.id
      };
    });

    try {
      await kirimNotifikasiBatch({
        penerimaList,
        kategori: currentTabConfig.kategori,
        periodeId: periode.id,
        rolePath: currentTabConfig.rolePath,
        periodeData: {
          nama_periode: periode?.nama_periode,
          tgl_mulai: periode?.tgl_mulai,
          tgl_selesai: periode?.tgl_selesai,
        },
        onProgress: (progress) => {
          setKirimProgress(prev => ({
            ...prev,
            sent: progress.status === 'SUCCESS' ? prev.sent + 1 : prev.sent,
            failed: progress.status === 'FAILED' ? prev.failed + 1 : prev.failed,
            logs: [
              {
                status: progress.status,
                nama: progress.nama,
                error: progress.error
              },
              ...prev.logs.slice(0, 49) // Keep last 50 logs
            ]
          }));
        },
        onComplete: (results) => {
          setSedangMengirim(false);
          // Refresh data
          queryClient.invalidateQueries({ queryKey: [`partisipan-${tab}`, periode?.id] });
          toast.success(
            `Pengiriman selesai! Berhasil: ${results.berhasil.length}, Gagal: ${results.gagal.length}`
          );
        }
      });
    } catch (err) {
      setSedangMengirim(false);
      toast.error(err.message);
    }
  }, [tab, daftarNominee, daftarPenilai, daftarJuri, currentTabConfig, periode, queryClient]);

  /**
   * Filter daftar partisipan
   */
  const filter = (list) =>
    list.filter((item) => {
      const p = item.nominee || item.pegawai;
      if (!cari) return true;
      const q = cari.toLowerCase();
      return (
        p?.nama?.toLowerCase().includes(q) ||
        p?.nip_baru?.includes(q) ||
        p?.no_hp?.includes(q)
      );
    });

  // Data based on active tab
  const daftar = tab === 'nominee' ? daftarNominee : tab === 'penilai' ? daftarPenilai : daftarJuri;
  const hasil = filter(daftar);
  const isLoading = tab === 'nominee' ? loadingNominee : tab === 'penilai' ? loadingPenilai : loadingJuri;

  // Statistics
  const total = daftar.length;
  const sudahTerKirim = daftar.filter(item => !!item.notifikasi_wa_sent_at).length;
  const belumTerKirim = total - sudahTerKirim;
  const denganHP = daftar.filter(item => {
    const p = item.nominee || item.pegawai;
    return p?.no_hp;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header: Tab Navigation + Statistik */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2">
          {availableTabs.map(t => (
            <TabButton
              key={t.key}
              label={t.label}
              dotColor={t.dotColor}
              active={tab === t.key}
              onClick={() => setTab(t.key)}
              count={t.data.length}
            />
          ))}
        </div>

        {/* Statistik & Tombol Aksi */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            WA: {sudahTerKirim}/{total} | HP: {denganHP}
          </span>

          {/* Tombol Kirim Bulk WA */}
          <button
            type="button"
            onClick={handleKirimBulkWA}
            disabled={sedangMengirim || belumTerKirim === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={belumTerKirim === 0 ? 'Semua sudah mendapat notifikasi' : `Kirim ke ${belumTerKirim} yang belum`}
          >
            {sedangMengirim ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Kirim Notifikasi WA
          </button>

          {/* Tombol Generate Token (hanya Nominee) */}
          {tab === 'nominee' && (
            <button
              type="button"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generateMut.isPending ? 'animate-spin' : ''}`} />
              Generate Token
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      {sedangMengirim && (
        <div className="rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 p-4">
          <p className="flex items-center gap-2 text-sm text-[#128C7E]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sedang mengirim notifikasi WA... Pesan muncul di Console Browser (F12).
          </p>
        </div>
      )}

      {/* Pencarian */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama, NIP, atau nomor HP..."
          className="input pl-10"
        />
      </div>

      {/* Tabel atau Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
        </div>
      ) : (
        <TabelPartisipan
          daftar={hasil}
          tab={tab}
          copiedId={terpilih}
          onCopy={salin}
          onToggleWaStatus={handleToggleWa}
          periode={periode}
          templates={templates}
        />
      )}

      {/* Progress Modal */}
      <ModalProgressKirim
        isOpen={isProgressOpen}
        onClose={() => !sedangMengirim && setIsProgressOpen(false)}
        progress={kirimProgress}
      />
    </div>
  );
}

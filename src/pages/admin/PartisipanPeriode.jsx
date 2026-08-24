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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Copy,
  CheckCircle2,
  RefreshCw,
  Loader2,
  MessageCircle,
  ExternalLink,
  Zap,
  Download,
  FileText,
  Mail,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
  fetchDaftarNomineeLengkap,
  fetchDaftarPenilaiLengkap,
  fetchDaftarJuriLengkap,
  generateTokenPenilaianMultiUnit,
  fetchUnitKerjaPeriode
} from '../../services/adminService';
import { kirimNotifikasiBatch, filterBelumTerkirim, generatePesan, pilihTemplateByKategori, PERAN_LABELS, toggleStatusTerkirim, toggleStatusEmailTerkirim, insertLogEmail, insertLogWaMe } from '../../services/kirimWaService';
import { fetchTemplateWaAktif } from '../../services/templateWaService';
import { formatHP } from '../../services/wabotLokalService';
import ModalProgressKirim from '../../components/common/ModalProgressKirim';
import Pagination from '../../components/common/Pagination';
import { MODE_PENILAIAN } from '../../utils/constants';

// =============================================================================
// KONSTANTA
// =============================================================================

const KATEGORI_MAP = {
  'nominee': 'NOMINEE',
  'penilai': 'PENILAI',
  'juri': 'JURI'
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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
 * Generate link token berdasarkan tab
 */
function generateLinkToken(tab, token) {
  const base = window.location.origin;
  if (tab === 'nominee') return `${base}/nominee?token=${token}`;
  if (tab === 'juri') return `${base}/juri?token=${token}`;
  if (tab === 'penilai') return `${base}/penilai/${token}`;
  return '';
}

/**
 * Generate pesan WA dari template
 */
function generateWaText(template, replacements) {
  if (!template?.isi_pesan) return '';
  let pesan = template.isi_pesan;
  for (const [key, value] of Object.entries(replacements)) {
    pesan = pesan.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
    pesan = pesan.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return pesan;
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
        (active ? 'text-navy-900 border-b-2 border-navy-700' : 'text-slate-400 hover:text-slate-600')
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
function PartisipanRow({ item, activeTab, copiedId, onCopy, onToggleWa, onToggleEmail, periode, templates, localSentIds, localSentEmailIds }) {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendingWaId, setSendingWaId] = useState(null);
  const p = item.nominee || item.pegawai;
  if (!p) return null;

  const isKetua = item.is_ketua_juri;
  const sudah = item.is_digunakan;
  const dbSent = !!item.notifikasi_wa_sent_at;
  const localSent = localSentIds?.has(item.id) ?? false;
  const sudahNotif = dbSent || localSent;

  const dbEmailSent = !!item.notifikasi_email_sent_at;
  const localEmailSent = localSentEmailIds?.has(item.id) ?? false;
  const sudahEmailNotif = dbEmailSent || localEmailSent;

  const hp = formatHP(p.no_hp);
  const linkToken = generateLinkToken(activeTab, item.token_akses);
  const kategoriLabel = activeTab.toUpperCase();

  // Filter templates berdasarkan activeTab
  let eligibleTemplates = [];
  if (templates && templates.length > 0) {
    const targetTag = `[${activeTab.toUpperCase()}]`;
    const specificTemplates = templates.filter((t) => t.nama_tampilan.toUpperCase().startsWith(targetTag));
    
    if (specificTemplates.length > 0) {
      eligibleTemplates = specificTemplates;
    } else {
      // Ambil yang umum (tidak ada tag khusus)
      eligibleTemplates = templates.filter((t) => {
        const up = t.nama_tampilan.toUpperCase();
        return !up.startsWith('[PENILAI]') && !up.startsWith('[NOMINEE]') && !up.startsWith('[JURI]');
      });
    }
  }

  // Select random template dari yang eligible
  const randomTemplate = eligibleTemplates.length > 0
    ? eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)]
    : null;

  const formatTanggal = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const sapaan = hitungSapaan(p.nama, p.nip_baru);
  const waText = randomTemplate
    ? generateWaText(randomTemplate, {
        NAMA: p.nama,
        PANGGILAN: sapaan ? sapaan.trim() + ' ' : '',
        LINK: linkToken,
        NAMA_PERIODE: periode?.nama_periode || '',
        PERAN: PERAN_LABELS[kategoriLabel] || kategoriLabel,
        TANGGAL_MULAI: formatTanggal(periode?.tgl_mulai),
        TANGGAL_SELESAI: formatTanggal(periode?.tgl_selesai)
      })
    : `Halo ${p.nama},\n\nBerikut link akses Anda:\n${linkToken}\n\nMohon tidak membagikan link ini.\nTerima kasih.`;

  const waHref = hp ? `https://wa.me/${hp}?text=${encodeURIComponent(waText)}` : '#';

  
  const handleSendWaApi = async () => {
    if (!hp) {
      toast.error('Nomor HP belum terdaftar.');
      return;
    }
    setSendingWaId(p.id);
    const toastId = toast.loading(`Mengirim WA ke ${p.nama}...`);
    try {
      const res = await fetch(`${import.meta.env.VITE_WA_API_URL}/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': import.meta.env.VITE_WA_API_KEY
        },
        body: JSON.stringify({ nomor: hp, pesan: waText })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengirim WA via API');
      toast.success(`WA sukses terkirim ke ${p.nama}!`, { id: toastId });
      
      // Update DB and local state
      insertLogWaMe(periode.id, p.id, hp, kategoriLabel);
      if (!sudahNotif && onToggleWa) {
        onToggleWa(item.id, true);
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setSendingWaId(null);
    }
  };

  const handleEmail = async () => {
    if (!p.email) {
      toast.error('Email pegawai belum terdaftar di database.');
      return;
    }
    setIsSendingEmail(true);
    const toastId = toast.loading(`Mengirim email ke ${p.nama}...`);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: p.email,
          nama_penerima: p.nama,
          link_penilaian: linkToken,
          sapaan: sapaan ? sapaan.trim() : 'Bapak/Ibu',
          nama_periode: periode?.nama_periode || 'Babel Memilih'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengirim email');
      toast.success(`Email berhasil dikirim ke ${p.nama}`, { id: toastId });
      await insertLogEmail(periode.id, p.id, kategoriLabel, p.email, 'SENT');
      
      // Update DB and local state
      if (!sudahEmailNotif && onToggleEmail) {
        onToggleEmail(item.id, true);
      }
    } catch (err) {
      toast.error(err.message, { id: toastId });
      await insertLogEmail(periode.id, p.id, kategoriLabel, p.email, 'FAILED', err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

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
              insertLogWaMe(periode.id, p.id, hp, kategoriLabel);
              !sudahNotif && onToggleWa(item.id, true);
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

      {/* Status Notifikasi (WA & Email) */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5 items-start">
          {/* WA Pill */}
          <button
            type="button"
            onClick={() => onToggleWa(item.id, !sudahNotif)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all hover:scale-105 ' +
              (sudahNotif
                ? 'bg-emerald-100 text-emerald-700 hover:bg-slate-100 hover:text-slate-600'
                : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700')
            }
            title={sudahNotif ? 'Klik untuk reset status WA' : 'Tandai WA terkirim'}
          >
            {sudahNotif ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
            WA
          </button>

          {/* Email Pill */}
          <button
            type="button"
            onClick={() => onToggleEmail && onToggleEmail(item.id, !sudahEmailNotif)}
            className={
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold transition-all hover:scale-105 ' +
              (sudahEmailNotif
                ? 'bg-blue-100 text-blue-700 hover:bg-slate-100 hover:text-slate-600'
                : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700')
            }
            title={sudahEmailNotif ? 'Klik untuk reset status Email' : 'Tandai Email terkirim'}
          >
            {sudahEmailNotif ? <CheckCircle2 className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
            Email
          </button>
        </div>
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
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCopy(item.token_akses, item.id)}
            className={
              'inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-colors ' +
              (copiedId === item.id 
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')
            }
            title="Salin Link Penilaian"
          >
            {copiedId === item.id ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>

          {hp && (
            <div className="inline-flex gap-1">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  insertLogWaMe(periode.id, p.id, hp, kategoriLabel);
                  !sudahNotif && onToggleWa(item.id, true);
                }}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                title="Buka via WhatsApp Web (WA.Me)"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <button
                type="button"
                disabled={sendingWaId === p.id}
                onClick={handleSendWaApi}
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300 transition-colors disabled:opacity-50"
                title="Kirim Instan via WA Bot API"
              >
                {sendingWaId === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={isSendingEmail}
            onClick={handleEmail}
            className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
            title={p.email ? "Kirim Undangan via Email" : "Email pegawai belum terdaftar"}
          >
            {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * TabelPartisipan
 */
function TabelPartisipan({ daftar, tab, copiedId, onCopy, onToggleWa, onToggleEmail, periode, templates, localSentIds, localSentEmailIds, globalTotal, globalSubmitted }) {
  if (!daftar || daftar.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400">
        Belum ada data.
      </div>
    );
  }

  const percentage = globalTotal > 0 ? Math.round((globalSubmitted / globalTotal) * 100) : 0;

  return (
    <div className="mt-4">
      {/* Progress Recap */}
      {tab !== 'nominee' && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-700">Progress Penilaian</span>
            <span className="text-xs text-slate-500">{globalSubmitted} dari {globalTotal} partisipan telah menyelesaikan penilaian</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 sm:w-48 h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${percentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-700 w-10 text-right">{percentage}%</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
          <tr>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">No. HP</th>
            {tab === 'juri' && <th className="px-4 py-3">Peran</th>}
            <th className="px-4 py-3">Notifikasi</th>
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
              onToggleWa={onToggleWa}
              onToggleEmail={onToggleEmail}
              periode={periode}
              templates={templates}
              localSentIds={localSentIds}
              localSentEmailIds={localSentEmailIds}
            />
          ))}
        </tbody>
      </table>
    </div>
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
  const [filterSubmit, setFilterSubmit] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [tab, setTab] = useState('nominee');
  const [terpilih, setTerpilih] = useState(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [kirimProgress, setKirimProgress] = useState({ sent: 0, failed: 0, total: 0, logs: [] });
  const [sedangMengirim, setSedangMengirim] = useState(false);
  const [localSentIds, setLocalSentIds] = useState(new Set());
  const [localSentEmailIds, setLocalSentEmailIds] = useState(new Set());

  // Queries
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

  // Generate token mutation
  const generateMut = useMutation({
    mutationFn: async () => {
      let wilayahIds = new Set([periode.wilayah_id]);
      try {
        const units = await fetchUnitKerjaPeriode(periode.id);
        if (units && units.length > 0) {
          units.forEach(u => wilayahIds.add(u.wilayah_id));
        }
      } catch (err) {
        console.warn('Gagal memuat unit kerja multi-wilayah', err);
      }
      
      // Pastikan wilayah dari daftar nominee (lintas wilayah) juga diikutsertakan
      if (daftarNominee && daftarNominee.length > 0) {
        daftarNominee.forEach(n => {
          if (n.pegawai?.wilayah_id) {
            wilayahIds.add(n.pegawai.wilayah_id);
          }
        });
      }
      
      return generateTokenPenilaianMultiUnit(periode.id, Array.from(wilayahIds));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partisipan-nominee', periode?.id] });
      queryClient.invalidateQueries({ queryKey: ['partisipan-penilai', periode?.id] });
      toast.success('Token berhasil di-generate');
    },
    onError: (err) => toast.error(err.message),
  });

  // Toggle WA status with optimistic update
  const handleToggleWa = async (tokenId, shouldMarkSent) => {
    // 1. Update local state instantly
    setLocalSentIds(prev => {
      const next = new Set(prev);
      shouldMarkSent ? next.add(tokenId) : next.delete(tokenId);
      return next;
    });

    // 2. Update server
    try {
      const kategori = KATEGORI_MAP[tab] || 'NOMINEE';
      await toggleStatusTerkirim(kategori, tokenId, shouldMarkSent);
      queryClient.invalidateQueries({ queryKey: [`partisipan-${tab}`, periode?.id] });
      toast.success(shouldMarkSent ? 'Status WhatsApp diperbarui' : 'Status direset');
    } catch (err) {
      // Rollback on error
      setLocalSentIds(prev => {
        const next = new Set(prev);
        shouldMarkSent ? next.delete(tokenId) : next.add(tokenId);
        return next;
      });
      toast.error(err.message);
    }
  };

  const handleToggleEmail = async (tokenId, shouldMarkSent) => {
    setLocalSentEmailIds(prev => {
      const next = new Set(prev);
      shouldMarkSent ? next.add(tokenId) : next.delete(tokenId);
      return next;
    });

    try {
      const kategori = KATEGORI_MAP[tab] || 'NOMINEE';
      await toggleStatusEmailTerkirim(kategori, tokenId, shouldMarkSent);
      queryClient.invalidateQueries({ queryKey: [`partisipan-${tab}`, periode?.id] });
    } catch (err) {
      setLocalSentEmailIds(prev => {
        const next = new Set(prev);
        shouldMarkSent ? next.delete(tokenId) : next.add(tokenId);
        return next;
      });
      toast.error(err.message);
    }
  };

  // Copy token link
  const handleCopy = (token, id) => {
    navigator.clipboard.writeText(generateLinkToken(tab, token));
    setTerpilih(id);
    setTimeout(() => setTerpilih(null), 2000);
    toast.success('Link berhasil disalin');
  };

  // Tab config
  const availableTabs = [
    { key: 'nominee', data: daftarNominee, label: 'Nominee', dotColor: 'bg-emerald-500', kategori: 'NOMINEE', rolePath: 'nominee' },
    ...(periode?.mode_penilaian !== MODE_PENILAIAN.MODE_2
      ? [{ key: 'penilai', data: daftarPenilai, label: 'Penilai', dotColor: 'bg-blue-500', kategori: 'PENILAI', rolePath: 'penilai' }]
      : []),
    ...(periode?.mode_penilaian === MODE_PENILAIAN.MODE_2
      ? [{ key: 'juri', data: daftarJuri, label: 'Juri', dotColor: 'bg-amber-500', kategori: 'JURI', rolePath: 'juri' }]
      : []),
  ].filter(t => t.data.length > 0);

  // Auto-select tab
  useEffect(() => {
    if (!availableTabs.find(t => t.key === tab)) {
      setTab(availableTabs[0]?.key || 'nominee');
    }
  }, [availableTabs, tab]);

  const currentTabConfig = availableTabs.find(t => t.key === tab) || availableTabs[0];

  // Bulk send
  const handleKirimBulkWA = useCallback(async () => {
    if (!currentTabConfig) return;

    const currentList = tab === 'nominee' ? daftarNominee : tab === 'penilai' ? daftarPenilai : daftarJuri;
    const belumTerKirim = filterBelumTerkirim(currentList);
    const denganHP = currentList.filter(item => {
      const p = item.nominee || item.pegawai;
      return p?.no_hp;
    });

    if (denganHP.length === 0) {
      toast.error('Tidak ada penerima yang belum mendapat notifikasi atau belum punya nomor HP');
      return;
    }

    const konfirmasi = window.confirm(
      `Kirim notifikasi WA ke ${denganHP.length} ${currentTabConfig.label.toLowerCase()}?\n\n` +
      `Pesan akan dipilih secara random dari template aktif.\n` +
      `Jeda 11-18 detik antar pesan untuk menghindari banned.`
    );

    if (!konfirmasi) return;

    setKirimProgress({ sent: 0, failed: 0, total: denganHP.length, logs: [] });
    setIsProgressOpen(true);
    setSedangMengirim(true);

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
            statusText: progress.statusText,
            logs: [{ status: progress.status, nama: progress.nama, error: progress.error }, ...prev.logs.slice(0, 49)]
          }));
        },
        onComplete: (results) => {
          setSedangMengirim(false);
          queryClient.invalidateQueries({ queryKey: [`partisipan-${tab}`, periode?.id] });
          toast.success(
            `Selesai! Berhasil: ${results.berhasil.length}, Gagal: ${results.gagal.length}`
          );
        }
      });
    } catch (err) {
      setSedangMengirim(false);
      toast.error(err.message);
    }
  }, [tab, daftarNominee, daftarPenilai, daftarJuri, currentTabConfig, periode, queryClient]);

  // Bulk send Email
  const handleKirimBulkEmail = useCallback(async () => {
    if (!currentTabConfig) return;

    const currentList = tab === 'nominee' ? daftarNominee : tab === 'penilai' ? daftarPenilai : daftarJuri;
    const belumTerKirim = filterBelumTerkirim(currentList, 'notifikasi_email_sent_at');
    const denganEmail = belumTerKirim.filter(item => {
      const p = item.nominee || item.pegawai;
      return p?.email;
    });

    if (denganEmail.length === 0) {
      toast.error('Tidak ada penerima yang belum mendapat notifikasi email atau belum punya alamat email');
      return;
    }

    const konfirmasi = window.confirm(
      `Kirim notifikasi EMAIL ke ${denganEmail.length} ${currentTabConfig.label.toLowerCase()} yang belum menerima?\n\n` +
      `Sistem akan memberi jeda 2-4 detik antar pesan agar terlihat natural dan aman dari spam.`
    );

    if (!konfirmasi) return;

    setKirimProgress({ sent: 0, failed: 0, total: denganEmail.length, logs: [] });
    setIsProgressOpen(true);
    setSedangMengirim(true);

    let sentCount = 0;
    let failedCount = 0;
    const logs = [];

    for (let i = 0; i < denganEmail.length; i++) {
      const item = denganEmail[i];
      const p = item.nominee || item.pegawai;
      const kategoriLabel = currentTabConfig.kategori;
      const linkToken = `${window.location.origin}/nominee?token=${item.token_akses}`;
      const sapaan = hitungSapaan(p.nama, p.nip_baru);
      const namaPeriode = periode?.nama_periode || 'Babel Memilih';

      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: p.email,
            nama_penerima: p.nama,
            link_penilaian: linkToken,
            sapaan: sapaan ? sapaan.trim() : 'Bapak/Ibu',
            nama_periode: namaPeriode
          })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.message || 'Gagal mengirim email');
        
        await insertLogEmail(periode.id, p.id, kategoriLabel, p.email, 'SENT');
        await toggleStatusEmailTerkirim(kategoriLabel, item.id, true);
        
        sentCount++;
        logs.unshift({ status: 'SUCCESS', nama: p.nama });
      } catch (err) {
        await insertLogEmail(periode.id, p.id, kategoriLabel, p.email, 'FAILED', err.message);
        failedCount++;
        logs.unshift({ status: 'FAILED', nama: p.nama, error: err.message });
      }

      // Update progress
      setKirimProgress({
        sent: sentCount,
        failed: failedCount,
        total: denganEmail.length,
        logs: logs.slice(0, 50)
      });

      // Natural delay 2-4 seconds, unless it's the last item
      if (i < denganEmail.length - 1) {
        const delay = Math.floor(Math.random() * 2000) + 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setSedangMengirim(false);
    queryClient.invalidateQueries({ queryKey: [`partisipan-${tab}`, periode?.id] });
    toast.success(`Selesai! Berhasil: ${sentCount}, Gagal: ${failedCount}`);
  }, [tab, daftarNominee, daftarPenilai, daftarJuri, currentTabConfig, periode, queryClient]);

  // Filter
  const filterDaftar = (list) => {
    let filtered = list;
    if (filterSubmit === 'SUDAH') {
      filtered = filtered.filter(item => item.is_digunakan);
    } else if (filterSubmit === 'BELUM') {
      filtered = filtered.filter(item => !item.is_digunakan);
    }

    if (!cari) return filtered;
    const q = cari.toLowerCase();
    return filtered.filter(item => {
      const p = item.nominee || item.pegawai;
      return (
        p?.nama?.toLowerCase().includes(q) ||
        p?.nip_baru?.includes(q) ||
        p?.no_hp?.includes(q)
      );
    });
  };

  // Data based on active tab
  const daftar = tab === 'nominee' ? daftarNominee : tab === 'penilai' ? daftarPenilai : daftarJuri;
  const hasil = filterDaftar(daftar);

  const handleExportCsv = () => {
    if (hasil.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const header = ['Nama', 'NIP', 'No HP', 'Unit Kerja', 'Status Submit', 'Waktu Submit'].join(',');
    const rows = hasil.map(item => {
      const p = item.nominee || item.pegawai;
      const statusSubmit = item.is_digunakan ? 'Sudah Submit' : 'Belum Submit';
      const waktuSubmit = item.digunakan_pada ? new Date(item.digunakan_pada).toLocaleString('id-ID') : '-';
      return [
        `"${p?.nama || ''}"`,
        `"${p?.nip_baru || p?.nip || ''}"`,
        `"${p?.no_hp || ''}"`,
        `"${p?.unit_kerja || ''}"`,
        `"${statusSubmit}"`,
        `"${waktuSubmit}"`
      ].join(',');
    });
    
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Export_${tab}_${filterSubmit}_${periode?.nama_periode || 'periode'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    if (hasil.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.text(`Daftar ${tab.toUpperCase()} - ${periode?.nama_periode || ''}`, 40, 40);
    
    const tableColumn = ["Nama", "NIP", "No HP", "Unit Kerja", "Status Submit"];
    const tableRows = [];

    hasil.forEach(item => {
      const p = item.nominee || item.pegawai;
      const statusSubmit = item.is_digunakan ? 'Sudah Submit' : 'Belum Submit';
      const rowData = [
        p?.nama || '-',
        p?.nip_baru || p?.nip || '-',
        p?.no_hp || '-',
        p?.unit_kerja || '-',
        statusSubmit
      ];
      tableRows.push(rowData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 50, 74] } // navy-800
    });

    doc.save(`Export_${tab}_${filterSubmit}_${periode?.nama_periode || 'periode'}.pdf`);
  };

  const totalPages = Math.ceil(hasil.length / itemsPerPage);
  const paginatedHasil = useMemo(() => {
    return hasil.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [hasil, currentPage]);

  const isLoading = tab === 'nominee' ? loadingNominee : tab === 'penilai' ? loadingPenilai : loadingJuri;

  // Stats
  const total = daftar.length;
  const sudahTerKirim = daftar.filter(item => !!item.notifikasi_wa_sent_at).length;
  const belumTerKirim = total - sudahTerKirim;
  const denganHP = daftar.filter(item => {
    const p = item.nominee || item.pegawai;
    return p?.no_hp;
  }).length;
  const totalSubmitted = daftar.filter(item => item.is_digunakan).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {availableTabs.map(t => (
            <TabButton
              key={t.key}
              label={t.label}
              dotColor={t.dotColor}
              active={tab === t.key}
              onClick={() => { setTab(t.key); setCurrentPage(1); }}
              count={t.data.length}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            WA: {sudahTerKirim}/{total} | HP: {denganHP}
          </span>

          
          
          <button
            type="button"
            onClick={handleKirimBulkWA}
            disabled={sedangMengirim || belumTerKirim === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={belumTerKirim === 0 ? 'Semua sudah terkirim' : `Kirim WA ke ${belumTerKirim} yang belum`}
          >
            {sedangMengirim ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Kirim Bulk WA API
          </button>
          
          <button
            className="btn btn-warning flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            onClick={handleKirimBulkEmail}
            disabled={sedangMengirim || daftar.filter(item => !item.notifikasi_email_sent_at && (item.nominee?.email || item.pegawai?.email)).length === 0}
            title="Kirim Semua Email (Otomatis seleksi yang belum terkirim)"
          >
            <Mail className="h-3.5 w-3.5" />
            Kirim Bulk Email
          </button>

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
            Sedang mengirim notifikasi WA...
          </p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={cari}
            onChange={(e) => { setCari(e.target.value); setCurrentPage(1); }}
            placeholder="Cari nama, NIP, atau nomor HP..."
            className="input pl-10"
          />
        </div>
        <select
          value={filterSubmit}
          onChange={(e) => { setFilterSubmit(e.target.value); setCurrentPage(1); }}
          className="input sm:w-48 bg-white cursor-pointer border-slate-200"
        >
          <option value="ALL">Semua Status</option>
          <option value="SUDAH">Sudah Submit</option>
          <option value="BELUM">Belum Submit</option>
        </select>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button
          onClick={handleExportPdf}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
        >
          <FileText className="h-4 w-4" /> Export PDF
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
        </div>
      ) : (
        <>
            <TabelPartisipan
              daftar={paginatedHasil}
              tab={tab}
              copiedId={terpilih}
              onCopy={handleCopy}
              onToggleWa={handleToggleWa}
              onToggleEmail={handleToggleEmail}
              periode={periode}
              templates={templates}
              localSentIds={localSentIds}
              localSentEmailIds={localSentEmailIds}
              globalTotal={total}
              globalSubmitted={totalSubmitted}
            />
          {!isLoading && hasil.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={hasil.length}
              itemsPerPage={itemsPerPage}
            />
          )}
        </>
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

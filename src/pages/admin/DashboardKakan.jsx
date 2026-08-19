/**
 * @fileoverview Halaman Dashboard Kakan.
 *
 * Menampilkan:
 * - Hasil penilaian (top N kandidat)
 * - Pemenang per kategori (MODE_1B Hybrid) dengan auto-lock + override
 * - Catatan juri (Mode 2)
 * - Form kunci pemenang
 *
 * @module pages/admin/DashboardKakan
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Medal, MessageSquare, Download, Trophy, TrendingUp, ChevronDown, LayoutGrid, Star, Lock, Unlock, RefreshCw, ChevronDown as ChevronDownIcon, ChevronUp, Crown } from 'lucide-react';

import { fetchPeriodeList, fetchWilayahList } from '../../services/adminService';
import {
  fetchRekapMode1A,
  fetchRekapMode1B,
  fetchRekapMode1C,
  fetchRekapMode2,
  fetchRekapMode2A,
  fetchVotingKategori,
  fetchCatatanKualitatifJuri,
  fetchDetailPenilaianJuri,
  fetchKeputusanKakan,
  kuncikanPemenang,
  fetchPemenangPerKategori,
  setPemenangPerKategori,
  autoLockPemenangPerKategori,
  resetPemenangPerKategori,
  fetchKelengkapanPenilai,
} from '../../services/votingService';
import { MODE_PENILAIAN, MODE_PENILAIAN_LABEL } from '../../utils/constants';

import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';
import RekapDetailJuri from './components/RekapDetailJuri';
import FormKunciPemenang from '../../components/common/FormKunciPemenang';
import Podium from '../../components/common/Podium';

/** Mapping mode ke fungsi fetch. */
const FETCH_REKAP = {
  [MODE_PENILAIAN.MODE_1A]: fetchRekapMode1A,
  [MODE_PENILAIAN.MODE_1B]: fetchRekapMode1B, // Will be overridden if hybrid has categories
  [MODE_PENILAIAN.MODE_2A]: fetchRekapMode2A,
  [MODE_PENILAIAN.MODE_2]: fetchRekapMode2,
};

/**
 * Format skor sesuai mode.
 */
function skorTampil(mode, r, isHybrid = false) {
  if (mode === MODE_PENILAIAN.MODE_1A) return `${Number(r.skor_akhir_persen ?? 0).toFixed(1)}%`;
  if (mode === MODE_PENILAIAN.MODE_1B) {
    // Hybrid mode: gunakan total_suara
    const suara = r.total_suara ?? 0;
    return `${suara} suara`;
  }
  if (mode === MODE_PENILAIAN.MODE_2A) {
    return `${Number(r.rata_rata_skor ?? 0).toFixed(1)} poin`;
  }
  return Number(r.skor_akhir_juri ?? 0).toFixed(2);
}

/**
 * Styled Select untuk dropdown periode.
 */
function SelectDropdown({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-navy-400 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-100"
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? (
            <span>
              <span className="font-medium">{selected.label}</span>
              <span className="ml-2 text-xs text-slate-500">({selected.mode})</span>
            </span>
          ) : placeholder}
        </span>
        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-soft-lg max-h-64 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">Tidak ada periode</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors ${
                  opt.value === value ? 'bg-navy-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className="font-medium text-slate-800">{opt.label}</span>
                <span className="text-xs text-slate-500">
                  {opt.mode} · {opt.status}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Content utama dashboard.
 */
function DashboardKakanContent({ adminProfile }) {
  const [periodeId, setPeriodeId] = useState('');
  const [error, setError] = useState(null);
  const [selectedKategoriTab, setSelectedKategoriTab] = useState(null); // null = overview, number = kategori id
  const queryClient = useQueryClient();

  const { data: wilayahList = [] } = useQuery({
    queryKey: ['wilayah-list'],
    queryFn: fetchWilayahList,
  });

  const { data: rawPeriodeList = [] } = useQuery({
    queryKey: ['periode-list'],
    queryFn: () => fetchPeriodeList(),
  });

  const periodeList = useMemo(() => {
    if (wilayahList.length === 0 || rawPeriodeList.length === 0) return [];
    
    // Cari tahu level wilayah Kakan ini (Provinsi atau KabKota)
    const kakanWilayah = wilayahList.find(w => String(w.id) === String(adminProfile.wilayah_id));
    if (!kakanWilayah) return rawPeriodeList;

    if (kakanWilayah.level === 'KABKOTA') {
      // Kakan Kab/Kota HANYA boleh melihat periodenya sendiri
      return rawPeriodeList.filter(p => String(p.wilayah_id) === String(kakanWilayah.id));
    } else if (kakanWilayah.level === 'PROVINSI') {
      // Kakan Provinsi boleh melihat Provinsinya sendiri DAN seluruh Kab/Kota di bawahnya
      return rawPeriodeList.filter(p => 
        String(p.wilayah_id) === String(kakanWilayah.id) || 
        String(wilayahList.find(w => String(w.id) === String(p.wilayah_id))?.parent_id) === String(kakanWilayah.id)
      );
    }
    
    return rawPeriodeList;
  }, [rawPeriodeList, wilayahList, adminProfile]);

  const periode = periodeList.find((p) => p.id === Number(periodeId));
  const mode = periode?.mode_penilaian;

  // Fetch voting kategori untuk MODE_1B hybrid
  const { data: votingKategori = [] } = useQuery({
    queryKey: ['voting-kategori-admin', periodeId],
    queryFn: () => fetchVotingKategori(Number(periodeId)),
    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_1B,
  });

  // Fetch rekap - MODE_1B hybrid uses fetchRekapMode1C if has categories
  const isMode1BKategori = mode === MODE_PENILAIAN.MODE_1B && votingKategori.length > 0;

  const { data: rekap = [], isLoading: loadingRekap } = useQuery({
    queryKey: ['rekap-kakan', periodeId, mode, votingKategori.length],
    queryFn: () => isMode1BKategori ? fetchRekapMode1C(Number(periodeId)) : FETCH_REKAP[mode](Number(periodeId)),
    enabled: Boolean(periodeId) && Boolean(mode),
  });

  const topN = periode?.jumlah_kandidat_kakan ?? 3;

  // Handle different data structure per mode
  const rekapData = isMode1BKategori
    ? (rekap?.overview ?? [])
    : (Array.isArray(rekap) ? rekap : []);

  // For hybrid mode - get data for selected category tab
  const selectedKategori = selectedKategoriTab
    ? votingKategori.find((k) => k.id === selectedKategoriTab)
    : null;

  const kategoriNominees = selectedKategori && rekap?.kategori
    ? (rekap.kategori.find((k) => k.id === selectedKategori.id)?.nominees ?? [])
    : [];

  // Determine which data to show based on tab
  const displayData = selectedKategori
    ? kategoriNominees
    : (rekapData.length > 0 ? rekapData : []);

  const rekapTopN = displayData;

  // Fetch catatan juri (Mode 2)
  const { data: catatan = [] } = useQuery({
    queryKey: ['catatan-juri', periodeId],
    queryFn: () => fetchCatatanKualitatifJuri(Number(periodeId)),
    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,
  });

  // Fetch rincian nilai juri (Mode 2)
  const { data: detailJuri = [], isLoading: loadingDetailJuri } = useQuery({
    queryKey: ['detail-juri', periodeId],
    queryFn: () => fetchDetailPenilaianJuri(Number(periodeId)),
    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,
  });

  // Fetch keputusan
  const { data: keputusanSaatIni } = useQuery({
    queryKey: ['keputusan-kakan', periodeId],
    queryFn: () => fetchKeputusanKakan(Number(periodeId)),
    enabled: Boolean(periodeId),
  });

  // Fetch status kepatuhan (apakah semua penilai sudah submit)
  const { data: statusKelengkapan } = useQuery({
    queryKey: ['kepatuhan-penilai', periodeId, mode],
    queryFn: () => fetchKelengkapanPenilai(Number(periodeId), mode),
    enabled: Boolean(periodeId && mode),
  });

  // Mutation kunci pemenang
  const mutasiKunci = useMutation({
    mutationFn: ({ pemenangId, catatan: catatanPertimbangan }) =>
      kuncikanPemenang(Number(periodeId), adminProfile.id, pemenangId, catatanPertimbangan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keputusan-kakan', periodeId] });
      toast.success('Keputusan pemenang berhasil dikunci!');
    },
    onError: (err) => {
      setError(err.message);
      toast.error('Gagal mengunci pemenang: ' + err.message);
    },
  });

  // =============================================================================
  // MODE_1B HYBRID: Pemenang Per Kategori (Auto-Lock + Override)
  // =============================================================================

  // State untuk override winner
  const [overrideWinner, setOverrideWinner] = useState(null); // { kategoriId, nomineeId }
  const [showOverrideDropdown, setShowOverrideDropdown] = useState(null); // kategoriId

  // Query: pemenang per kategori
  const { data: pemenangPerKategori = [], isLoading: loadingPemenang } = useQuery({
    queryKey: ['pemenang-per-kategori', periodeId],
    queryFn: () => fetchPemenangPerKategori(Number(periodeId)),
    enabled: Boolean(periodeId) && isMode1BKategori,
  });

  // Mutation: Set/UPDATE pemenang per kategori (override)
  const mutasiOverride = useMutation({
    mutationFn: ({ kategoriId, nomineeId }) =>
      setPemenangPerKategori(Number(periodeId), kategoriId, nomineeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pemenang-per-kategori', periodeId] });
      toast.success('Pemenang kategori berhasil diupdate');
      setShowOverrideDropdown(null);
      setOverrideWinner(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Mutation: Auto-lock semua pemenang per kategori
  const mutasiAutoLock = useMutation({
    mutationFn: () => autoLockPemenangPerKategori(Number(periodeId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pemenang-per-kategori', periodeId] });
      toast.success('Auto-lock pemenang berhasil direfresh');
    },
    onError: (err) => toast.error(err.message),
  });

  // Mutation: Reset satu kategori ke auto
  const mutasiResetKategori = useMutation({
    mutationFn: (kategoriId) => resetPemenangPerKategori(Number(periodeId), kategoriId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pemenang-per-kategori', periodeId] });
      toast.success('Pemenang kategori direset ke auto-lock');
    },
    onError: (err) => toast.error(err.message),
  });

  // Opsi nominee untuk form kunci
  const opsiNominee = rekapTopN.map((r, idx) => ({
    nominee_id: r.nominee_id,
    nama_nominee: r.nama_nominee || r.nama,
    peringkat: r.peringkat_keseluruhan ?? r.peringkat ?? idx + 1,
    skor_akhir_juri: mode === MODE_PENILAIAN.MODE_2 ? r.skor_akhir_juri : null,
  }));

  // Export CSV
  function handleExport() {
    if (!rekapTopN.length) return;

    // Determine filename based on tab
    const exportName = selectedKategori
      ? selectedKategori.nama_kategori.replace(/ /g, '_')
      : `Top${topN}`;

    const exportData = rekapTopN.map((r) => {
      const peringkat = selectedKategori
        ? (r.peringkat ?? r.peringkat_dalam_kategori ?? 0)
        : (r.peringkat_keseluruhan ?? r.peringkat ?? 0);
      const suara = selectedKategori
        ? (r.total_suara ?? 0)
        : (r.total_suara ?? 0);

      return {
        Peringkat: peringkat,
        Nama: r.nama_nominee || r.nama || '-',
        NIP: r.nip_baru || '-',
        Unit_Kerja: r.unit_kerja || '-',
        Suara: suara,
      };
    });

    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData
      .map((row) =>
        Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + headers + '\n' + rows;
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Rekap_${periode?.nama_periode?.replace(/ /g, '_') || 'Periode'}_${exportName}.csv`;
    link.click();
  }

  // Pilihan dropdown
  const periodeOptions = periodeList.map((p) => ({
    value: p.id,
    label: p.nama_periode,
    mode: MODE_PENILAIAN_LABEL[p.mode_penilaian],
    status: p.status,
  }));

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
        }
      `}</style>
      
      <div className="space-y-6 print:hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 text-white shadow-lg">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Dashboard Kakan</h1>
          <p className="text-sm text-slate-500">Lihat hasil dan kunci pemenang</p>
        </div>
      </div>

      {/* Select Periode */}
      <SelectDropdown
        value={periodeId}
        onChange={(val) => {
          setPeriodeId(val);
          setError(null);
          setSelectedKategoriTab(null); // Reset tab on periode change
        }}
        options={periodeOptions}
        placeholder="-- Pilih Periode --"
      />

      {/* Konten */}
      {periodeId && (
        <>
          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* =================================================================== */}
          {/* PEMENANG PER KATEGORI (MODE_1B HYBRID) - AUTO-LOCK + OVERRIDE     */}
          {/* =================================================================== */}
          {isMode1BKategori && votingKategori.length > 0 && (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-gold-500" />
                  <h3 className="font-semibold text-navy-900">Pemenang Per Kategori</h3>
                </div>
                <button
                  onClick={() => mutasiAutoLock.mutate()}
                  disabled={mutasiAutoLock.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-navy-300 hover:bg-navy-50 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${mutasiAutoLock.isPending ? 'animate-spin' : ''}`} />
                  Refresh Auto-Lock
                </button>
              </div>

              {/* List Pemenang per Kategori */}
              {loadingPemenang ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
                  <p className="mt-2 text-sm text-slate-500">Memuat pemenang...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {votingKategori.map((kategori) => {
                    const winner = pemenangPerKategori.find((p) => p.kategori_id === kategori.id);
                    const isAuto = winner?.is_auto_locked ?? true;
                    const nomineesInKategori = rekap?.kategori?.find((k) => k.id === kategori.id)?.nominees ?? [];
                    const showDropdown = showOverrideDropdown === kategori.id;

                    return (
                      <div
                        key={kategori.id}
                        className={`rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md glass-premium ${
                          isAuto
                            ? 'border-emerald-200/60 bg-gradient-to-r from-emerald-50/50 to-white/60'
                            : 'border-amber-200/60 bg-gradient-to-r from-amber-50/50 to-white/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Info Kategori & Winner */}
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              isAuto ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              <Star className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-navy-900">{kategori.nama_kategori}</h4>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  isAuto
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {isAuto ? (
                                    <><Lock className="h-3 w-3" /> Auto-Lock</>
                                  ) : (
                                    <><Unlock className="h-3 w-3" /> Override Kakan</>
                                  )}
                                </span>
                              </div>
                              {winner ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <img
                                    src={
                                      ((!winner.nominee_id && !winner.id) || winner.nama_nominee?.toLowerCase().includes('abstain') || winner.nama_nominee?.toLowerCase().includes('kotak kosong')) 
                                        ? 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png'
                                        : (winner.foto_url || (winner.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${winner.nip}.jpg` : null))
                                    }
                                    alt={winner.nama_nominee}
                                    className={`h-6 w-6 rounded-full border border-white object-cover ${((!winner.nominee_id && !winner.id) || winner.nama_nominee?.toLowerCase().includes('abstain')) ? 'grayscale opacity-[.92]' : ''}`}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      if ((!winner.nominee_id && !winner.id) || winner.nama_nominee?.toLowerCase().includes('abstain')) {
                                        e.target.src = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png';
                                      } else {
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(winner.nama_nominee || 'P')}&background=16324a&color=fff&size=32`;
                                      }
                                    }}
                                  />
                                  <span className="font-medium text-slate-800">{winner.nama_nominee || 'Belum ada vote'}</span>
                                  {winner.suara_total > 0 && (
                                    <span className="text-sm text-slate-500">({winner.suara_total} suara)</span>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400 mt-1">Belum ada vote</p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {/* Override Button */}
                            <div className="relative">
                              <button
                                onClick={() => setShowOverrideDropdown(showDropdown ? null : kategori.id)}
                                className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-navy-300 hover:bg-navy-50 transition-all"
                              >
                                Override
                                {showDropdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
                              </button>

                              {/* Dropdown untuk pilih nominee lain */}
                              {showDropdown && (
                                <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-slate-200 bg-white shadow-soft-lg max-h-64 overflow-y-auto">
                                  {nomineesInKategori.map((n) => (
                                    <button
                                      key={n.id}
                                      onClick={() => {
                                        mutasiOverride.mutate({ kategoriId: kategori.id, nomineeId: n.id });
                                        setShowOverrideDropdown(null);
                                      }}
                                      disabled={mutasiOverride.isPending}
                                      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors ${
                                        winner?.nominee_id === n.id ? 'bg-navy-50 text-navy-800 font-medium' : 'text-slate-700'
                                      }`}
                                    >
                                      <img
                                        src={
                                          ((!n.nominee_id && !n.id) || n.nama?.toLowerCase().includes('abstain') || n.nama?.toLowerCase().includes('kotak kosong'))
                                            ? 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png'
                                            : (n.foto_url || (n.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg` : null))
                                        }
                                      alt={n.nama}
                                      className={`h-6 w-6 rounded-full border border-slate-200 object-cover ${((!n.nominee_id && !n.id) || n.nama?.toLowerCase().includes('abstain')) ? 'grayscale opacity-[.92]' : ''}`}
                                      onError={(e) => {
                                        e.target.onerror = null;
                                        if ((!n.nominee_id && !n.id) || n.nama?.toLowerCase().includes('abstain')) {
                                          e.target.src = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png';
                                        } else {
                                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.nama || 'P')}&background=16324a&color=fff&size=32`;
                                        }
                                      }}
                                    />
                                      <span className="flex-1 truncate">{n.nama}</span>
                                      <span className="text-xs text-slate-400">{n.total_suara ?? 0} suara</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reset to Auto Button */}
                            {!isAuto && (
                              <button
                                onClick={() => mutasiResetKategori.mutate(kategori.id)}
                                disabled={mutasiResetKategori.isPending}
                                className="flex items-center gap-1.5 rounded-lg bg-white border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-all"
                              >
                                Reset Auto
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tabs untuk MODE_1B Hybrid */}
          {isMode1BKategori && votingKategori.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {/* Tab Overview */}
              <button
                type="button"
                onClick={() => setSelectedKategoriTab(null)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  selectedKategoriTab === null
                    ? 'bg-navy-800 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-navy-300 hover:bg-navy-50'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Overview
              </button>

              {/* Tab per Kategori */}
              {votingKategori.map((kategori) => (
                <button
                  key={kategori.id}
                  type="button"
                  onClick={() => setSelectedKategoriTab(kategori.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    selectedKategoriTab === kategori.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <Star className="h-4 w-4" />
                  {kategori.nama_kategori}
                </button>
              ))}
            </div>
          )}

          {/* Rekap Top N / Kategori */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <div className="flex items-center gap-2">
                {selectedKategori ? (
                  <>
                    <Star className="h-5 w-5 text-emerald-600" />
                    <span className="font-semibold text-navy-900">{selectedKategori.nama_kategori}</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5 text-navy-700" />
                    <span className="font-semibold text-navy-900">Rekap Keseluruhan (Top {topN} Disorot)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  disabled={!rekapTopN.length}
                  className="btn-secondary text-xs bg-white text-navy-700 hover:bg-navy-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Cetak PDF
                </button>
                <button
                  onClick={handleExport}
                  disabled={!rekapTopN.length}
                  className="btn-primary text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Podium Visualization */}
            {!loadingRekap && rekapTopN.length > 0 && (
              <Podium 
                top3={rekapTopN.slice(0, 3)} 
                mode={mode} 
                isMode1BKategori={isMode1BKategori} 
                selectedKategori={selectedKategori} 
              />
            )}

            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {loadingRekap ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Memuat...
                    </td>
                  </tr>
                ) : rekapTopN.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Belum ada data penilaian
                    </td>
                  </tr>
                ) : (
                  rekapTopN.map((r) => {
                    // Determine rank based on view mode
                    const peringkat = selectedKategori
                      ? (r.peringkat ?? r.peringkat_dalam_kategori ?? 0)
                      : (r.peringkat_keseluruhan ?? r.peringkat ?? 0);

                    // Tentukan skor yang akan ditampilkan berdasarkan mode
                    let skorTampilnya = '';
                    if (mode === MODE_PENILAIAN.MODE_1A) {
                      skorTampilnya = `${Number(r.skor_akhir_persen ?? 0).toFixed(1)}%`;
                    } else if (mode === MODE_PENILAIAN.MODE_2) {
                      skorTampilnya = Number(r.skor_akhir_juri ?? 0).toFixed(2);
                    } else if (mode === MODE_PENILAIAN.MODE_2A) {
                      skorTampilnya = `${Number(r.rata_rata_skor ?? 0).toFixed(1)} poin`;
                    } else if (mode === MODE_PENILAIAN.MODE_1B) {
                      if (isMode1BKategori) {
                        if (selectedKategori) {
                          skorTampilnya = `${r.total_suara ?? 0} suara`;
                        } else {
                          skorTampilnya = `${r.total_keseluruhan ?? 0} suara`;
                        }
                      } else {
                        skorTampilnya = `${r.total_suara ?? 0} suara`;
                      }
                    }

                    const namaNominee = r.nama_nominee || r.nama || '-';

                    const isTopN = peringkat > 0 && peringkat <= topN;
                    
                    let bgClass = '';
                    let iconNode = null;
                    
                    if (peringkat === 1) {
                      bgClass = 'bg-gold-50/50';
                      iconNode = <Medal className="h-5 w-5 text-gold-500" />;
                    } else if (peringkat === 2) {
                      bgClass = 'bg-slate-100/70';
                      iconNode = <Medal className="h-5 w-5 text-slate-400" />;
                    } else if (peringkat === 3) {
                      bgClass = 'bg-amber-50/50';
                      iconNode = <Medal className="h-5 w-5 text-amber-700" />;
                    } else if (isTopN) {
                      bgClass = 'bg-emerald-50/30';
                    }

                    return (
                    <tr key={r.id || r.nominee_id} className={bgClass}>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-lg font-bold ${isTopN ? 'text-navy-800' : 'text-slate-600'}`}>
                          {iconNode && <span className="scale-125">{iconNode}</span>}
                          #{peringkat}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                            <img
                              src={
                                ((!r.nominee_id && !r.id) || r.foto_url?.includes('Kotak+Kosong') || namaNominee?.toLowerCase().includes('abstain') || namaNominee?.toLowerCase().includes('kotak kosong'))
                                  ? 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png'
                                  : (r.foto_url || (r.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${r.nip}.jpg` : null))
                              }
                              alt={namaNominee}
                              className={`h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm ${((!r.nominee_id && !r.id) || r.foto_url?.includes('Kotak+Kosong') || namaNominee?.toLowerCase().includes('abstain')) ? 'grayscale opacity-[.92]' : ''}`}
                              onError={(e) => {
                                e.target.onerror = null;
                                if ((!r.nominee_id && !r.id) || r.foto_url?.includes('Kotak+Kosong') || namaNominee?.toLowerCase().includes('abstain')) {
                                  e.target.src = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png';
                                } else {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(namaNominee || 'P')}&background=16324a&color=fff&size=64`;
                                }
                              }}
                            />
                          <div>
                            <p className="text-base font-bold text-slate-800">{namaNominee}</p>
                            <p className="text-sm text-slate-600">{r.unit_kerja}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right text-lg font-bold text-navy-800">
                        {skorTampilnya}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>

          {/* Rincian Detail Juri & Catatan (Mode 2) */}
          {mode === MODE_PENILAIAN.MODE_2 && (
            <RekapDetailJuri 
              detailJuri={detailJuri} 
              loading={loadingDetailJuri} 
              nominees={rekapTopN} 
            />
          )}

          {/* Form Kunci Pemenang */}
          <FormKunciPemenang
            opsiNominee={opsiNominee}
            keputusanSaatIni={keputusanSaatIni}
            onKunci={(pemenangId, catatanPertimbangan) => {
              setError(null);
              mutasiKunci.mutate({ pemenangId, catatan: catatanPertimbangan });
            }}
            isSubmitting={mutasiKunci.isPending}
            disabled={statusKelengkapan ? !statusKelengkapan.isComplete : false}
            disabledMessage={`Voting belum mencapai batas minimum 50%+1. (${statusKelengkapan?.submitted}/${statusKelengkapan?.total} selesai, butuh min ${statusKelengkapan?.minRequired})`}
          />
        </>
      )}
      </div>

      {/* =================================================================== */}
      {/* PRINT LAYOUT (PDF EXPORT)                                           */}
      {/* =================================================================== */}
      {periodeId && (
        <div className="hidden print:block font-sans text-slate-800 bg-white w-full">
          <div className="text-center mb-8 border-b-2 border-navy-900 pb-4">
            <h1 className="text-2xl font-bold text-navy-900 uppercase">Laporan Hasil Penilaian</h1>
            <h2 className="text-xl font-semibold text-navy-800 mt-2">{periode?.nama_periode}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Periode: {new Date(periode?.tgl_mulai).toLocaleDateString('id-ID')} s.d. {new Date(periode?.tgl_selesai).toLocaleDateString('id-ID')}
            </p>
            {statusKelengkapan && (
              <p className="text-sm font-semibold text-navy-700 mt-2">
                Tingkat Partisipasi Penilaian: {statusKelengkapan.submitted} dari {statusKelengkapan.total} Suara Masuk
              </p>
            )}
          </div>

          {/* Podium for Print Layout */}
          {!loadingRekap && rekapTopN.length > 0 && (
            <div className="mb-10 print:break-inside-avoid">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-navy-900">Top 3 Peringkat Tertinggi</h3>
              </div>
              {/* Add scaling to ensure it fits well on A4 portrait */}
              <div className="transform scale-[0.85] origin-top">
                <Podium 
                  top3={rekapTopN.slice(0, 3)} 
                  mode={mode} 
                  isMode1BKategori={isMode1BKategori} 
                  selectedKategori={selectedKategori} 
                />
              </div>
            </div>
          )}

          <div className="mb-6 print:break-inside-avoid">
            <h3 className="text-lg font-bold text-navy-900 mb-3 border-b border-slate-200 pb-2">
              Tabulasi Hasil {selectedKategori ? `(${selectedKategori.nama_kategori})` : 'Keseluruhan'}
            </h3>
            <table className="w-full text-left text-sm border-collapse border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-4 py-2 font-semibold">Peringkat</th>
                  <th className="border border-slate-300 px-4 py-2 font-semibold">Nama Nominee</th>
                  <th className="border border-slate-300 px-4 py-2 font-semibold text-right">Skor / Suara</th>
                </tr>
              </thead>
              <tbody>
                {rekapTopN.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border border-slate-300 px-4 py-4 text-center text-slate-500">
                      Belum ada data penilaian.
                    </td>
                  </tr>
                ) : (
                  rekapTopN.map((r) => {
                    const peringkat = selectedKategori
                      ? (r.peringkat ?? r.peringkat_dalam_kategori ?? 0)
                      : (r.peringkat_keseluruhan ?? r.peringkat ?? 0);
                      
                    let skorTampilnya = '';
                    if (mode === MODE_PENILAIAN.MODE_1A) {
                      skorTampilnya = `${Number(r.skor_akhir_persen ?? 0).toFixed(1)}%`;
                    } else if (mode === MODE_PENILAIAN.MODE_2) {
                      skorTampilnya = Number(r.skor_akhir_juri ?? 0).toFixed(2);
                    } else if (mode === MODE_PENILAIAN.MODE_2A) {
                      skorTampilnya = `${Number(r.rata_rata_skor ?? 0).toFixed(1)} poin`;
                    } else if (mode === MODE_PENILAIAN.MODE_1B) {
                      skorTampilnya = `${r.total_suara ?? 0} suara`;
                    } else if (selectedKategori) {
                      skorTampilnya = `${r.total_suara ?? 0} suara`;
                    }

                    const namaNominee = r.nama_nominee || r.nama || '-';

                    return (
                      <tr key={r.id || r.nominee_id} className={peringkat <= topN ? "bg-slate-50 font-medium" : ""}>
                        <td className="border border-slate-300 px-4 py-2 text-center">{peringkat}</td>
                        <td className="border border-slate-300 px-4 py-2">{namaNominee}</td>
                        <td className="border border-slate-300 px-4 py-2 text-right">{skorTampilnya}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mb-12">
            <h3 className="text-lg font-bold text-navy-900 mb-3 border-b border-slate-200 pb-2">Keputusan Kepala Kantor</h3>
            {keputusanSaatIni?.pemenang_id ? (
              <div className="space-y-2">
                <p className="text-base text-slate-800">
                  <span className="font-semibold">Pemenang Terpilih:</span> {keputusanSaatIni.pemenang?.nama}
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                  <span className="font-semibold">Catatan Pertimbangan:</span><br/>
                  {keputusanSaatIni.catatan_pertimbangan}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Belum ada keputusan yang dikunci pada sistem.</p>
            )}
          </div>

          <div className="flex justify-end mt-16 pt-8">
            <div className="text-center w-64">
              <p className="text-sm mb-20">Kepala Kantor,</p>
              <p className="font-bold underline text-sm">{adminProfile?.is_kakan ? adminProfile.nama : '......................................................'}</p>
              <p className="text-sm mt-1">NIP. .........................................</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function DashboardKakan() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <div className="w-full py-6">
            <DashboardKakanContent adminProfile={adminProfile} />
          </div>
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

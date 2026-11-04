import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserCheck, 
  Users, 
  Search, 
  Copy, 
  Check, 
  Share2, 
  Send,
  StopCircle,
  Trash2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Loader2, 
  ExternalLink,
  MessageSquare,
  Sparkles,
  Award,
  Lightbulb,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

import { 
  fetchPengusulPeriode, 
  simpanPengusulPionir, 
  hapusPengusulPionir, 
  fetchUnitKerjaPeriode, 
  fetchDaftarPegawaiAktifMultiUnit 
} from '../../../../services/adminService';
import { fetchDetailPengusulPionir } from '../../../../services/voting/rekapService';
import { kirimPesanLocalBot, formatHP } from '../../../../services/wabotLokalService';
import ConfirmModal from '../../../../components/common/ConfirmModal';
import Modal from '../../../../components/common/Modal';

export default function KelolaPengusulContent({ adminProfile, periodeId, periode, onNavigateNominee }) {
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'SUDAH', 'BELUM'
  const [copiedToken, setCopiedToken] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sendingBotId, setSendingBotId] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, failed: 0, total: 0, statusText: '', logs: [] });
  const cancelBulkRef = useRef(false);

  // State Modal Tambah
  const [modalSearch, setModalSearch] = useState('');
  const [selectedPegawaiIds, setSelectedPegawaiIds] = useState(new Set());

  // 1. Fetch daftar pengusul yang sudah ditunjuk
  const { data: pengusulList = [], isLoading: loadingPengusul } = useQuery({
    queryKey: ['pengusul-periode', Number(periodeId)],
    queryFn: () => fetchPengusulPeriode(Number(periodeId)),
    enabled: Boolean(periodeId),
  });

  // 2. Fetch detail usulan (siapa mengusulkan siapa & kata kuncinya)
  const { data: detailUsulan = [] } = useQuery({
    queryKey: ['detail-pengusul-pionir', Number(periodeId)],
    queryFn: () => fetchDetailPengusulPionir(Number(periodeId)),
    enabled: Boolean(periodeId),
  });

  // 3. Fetch wilayah unit kerja periode untuk modal tambah pengusul
  const { data: unitKerjaList = [] } = useQuery({
    queryKey: ['unit-kerja-periode', periodeId],
    queryFn: () => fetchUnitKerjaPeriode(Number(periodeId)),
    enabled: Boolean(periodeId) && showAddModal,
  });

  const wilayahIds = useMemo(() => unitKerjaList.map((u) => u.wilayah_id), [unitKerjaList]);

  // 4. Fetch pegawai aktif untuk modal tambah pengusul susulan
  const { data: pegawaiTersedia = [], isLoading: loadingPegawaiTersedia } = useQuery({
    queryKey: ['pegawai-aktif-multi', wilayahIds],
    queryFn: () => fetchDaftarPegawaiAktifMultiUnit(wilayahIds, ''),
    enabled: showAddModal && wilayahIds.length > 0,
  });

  // Pemetaan hasil usulan pengusul (1 pengusul = 1 usulan)
  const usulanByPengusulId = useMemo(() => {
    const map = new Map();
    detailUsulan.forEach((item) => {
      if (!map.has(item.pengusul_id)) {
        map.set(item.pengusul_id, {
          kandidatNama: item.kandidat?.nama,
          kandidatNip: item.kandidat?.nip,
          kataKunci: item.kata_kunci,
          deskripsiInovasi: item.deskripsi_inovasi || '',
          submittedAt: item.created_at,
        });
      }
    });
    return map;
  }, [detailUsulan]);

  // Mutasi tambah pengusul susulan
  const mutasiTambah = useMutation({
    mutationFn: (ids) => simpanPengusulPionir(Number(periodeId), ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengusul-periode', Number(periodeId)] });
      setShowAddModal(false);
      setSelectedPegawaiIds(new Set());
      setModalSearch('');
      toast.success('Tim pengusul berhasil ditambahkan!');
    },
    onError: (err) => {
      toast.error(`Gagal menambah pengusul: ${err.message}`);
    },
  });

  // Mutasi hapus pengusul
  const mutasiHapus = useMutation({
    mutationFn: ({ pengusulRowId, pegawaiId }) => 
      hapusPengusulPionir(pengusulRowId, Number(periodeId), pegawaiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengusul-periode', Number(periodeId)] });
      queryClient.invalidateQueries({ queryKey: ['detail-pengusul-pionir', Number(periodeId)] });
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', Number(periodeId)] });
      queryClient.invalidateQueries({ queryKey: ['rekap-pionir', Number(periodeId)] });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      toast.success('Pengusul berhasil dihapus.');
    },
    onError: (err) => {
      toast.error(`Gagal menghapus pengusul: ${err.message}`);
      setShowDeleteModal(false);
    },
  });

  // Filter daftar pengusul
  const filteredPengusul = useMemo(() => {
    return pengusulList.filter((p) => {
      const nama = p.pegawai?.nama?.toLowerCase() || '';
      const nip = p.pegawai?.nip || '';
      const q = searchQuery.toLowerCase();
      const matchSearch = nama.includes(q) || nip.includes(q);

      if (!matchSearch) return false;

      if (filterStatus === 'SUDAH') return Boolean(p.is_digunakan);
      if (filterStatus === 'BELUM') return !p.is_digunakan;
      return true;
    });
  }, [pengusulList, searchQuery, filterStatus]);

  // Set ID pegawai yang sudah jadi pengusul
  const existingPengusulPegawaiIds = useMemo(() => {
    return new Set(pengusulList.map((p) => p.pegawai_id));
  }, [pengusulList]);

  // Pegawai yang bisa dipilih di modal tambah pengusul
  const pegawaiBisaDipilih = useMemo(() => {
    return pegawaiTersedia
      .filter((pg) => !existingPengusulPegawaiIds.has(pg.id))
      .filter((pg) => {
        if (!modalSearch.trim()) return true;
        const q = modalSearch.toLowerCase();
        return (
          pg.nama?.toLowerCase().includes(q) ||
          pg.nip?.toLowerCase().includes(q) ||
          pg.unit_kerja?.toLowerCase().includes(q)
        );
      });
  }, [pegawaiTersedia, existingPengusulPegawaiIds, modalSearch]);

  // Handler Salin Link Token
  const handleCopyLink = (token, nama) => {
    const fullLink = `${window.location.origin}/penilai/${token}`;
    navigator.clipboard.writeText(fullLink);
    setCopiedToken(token);
    toast.success(`Link unik untuk ${nama} berhasil disalin!`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Handler Kirim Pesan WhatsApp
  const buatPesanWA = (p) => {
    const namaPegawai = p.pegawai?.nama || 'Bapak/Ibu';
    const linkAkses = `${window.location.origin}/penilai/${p.token_akses}`;
    const batasWaktu = periode?.tgl_selesai_fase1 
      ? new Date(periode.tgl_selesai_fase1).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB'
      : '-';

    const pesan = `Halo Bapak/Ibu *${namaPegawai}*,\n\nAnda ditunjuk sebagai *Tim Pengusul* pada kegiatan *${periode?.nama_periode || 'Pemilihan Insan Teladan (PIONIR)'}* di BPS.\n\nSebagai pengusul, Anda memiliki hak untuk mengusulkan 1 orang rekan kerja teladan beserta pengisian kuesioner BerAKHLAK.\n\nSilakan klik tautan rahasia berikut untuk memberikan usulan Anda:\n🔗 ${linkAkses}\n\n⏳ *Batas Waktu Pengusulan (Fase 1):* ${batasWaktu}\n\nTerima kasih atas partisipasi dan objektivitas Bapak/Ibu.`;

    return pesan;
  };

  const handleKirimWA = (p) => {
    const hp = formatHP(p.pegawai?.no_hp);
    const pesan = encodeURIComponent(buatPesanWA(p));
    const waUrl = hp ? `https://wa.me/${hp}?text=${pesan}` : `https://api.whatsapp.com/send?text=${pesan}`;
    window.open(waUrl, '_blank');
  };

  // Handler Kirim WA via Bot API (Satuan)
  const handleKirimWABot = async (p) => {
    const hp = formatHP(p.pegawai?.no_hp);
    const nama = p.pegawai?.nama || 'Pengusul';
    if (!hp) return toast.error(`Nomor HP untuk ${nama} belum terdaftar.`);

    setSendingBotId(p.id);
    const toastId = toast.loading(`Mengirim WA via Bot ke ${nama}...`);
    try {
      const res = await kirimPesanLocalBot(hp, buatPesanWA(p));
      if (!res.status) throw new Error(res.reason || 'Gagal mengirim WA via Bot');
      toast.success(`WA berhasil dikirim ke ${nama}!`, { id: toastId });
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setSendingBotId(null);
    }
  };

  // Handler Broadcast Bot WA Massal (Belum Mengusulkan, jeda aman 11-18 detik)
  const targetBroadcast = useMemo(
    () => pengusulList.filter((p) => !p.is_digunakan && Boolean(formatHP(p.pegawai?.no_hp))),
    [pengusulList]
  );

  const handleMulaiBroadcastBot = async () => {
    if (targetBroadcast.length === 0) return toast.error('Tidak ada pengusul belum submit dengan nomor HP valid.');
    cancelBulkRef.current = false;
    setIsBulkSending(true);
    setBulkProgress({ sent: 0, failed: 0, total: targetBroadcast.length, statusText: 'Memulai pengiriman...', logs: [] });

    let sent = 0, failed = 0;
    for (let i = 0; i < targetBroadcast.length; i++) {
      if (cancelBulkRef.current) break;
      const item = targetBroadcast[i];
      const nama = item.pegawai?.nama || 'Pengusul';
      const hp = formatHP(item.pegawai?.no_hp);

      setBulkProgress((prev) => ({ ...prev, statusText: `Mengirim (${i + 1}/${targetBroadcast.length}): ${nama}...` }));
      const res = await kirimPesanLocalBot(hp, buatPesanWA(item));

      if (res.status) {
        sent += 1;
        setBulkProgress((prev) => ({ ...prev, sent, logs: [{ ok: true, nama }, ...prev.logs.slice(0, 49)] }));
      } else {
        failed += 1;
        setBulkProgress((prev) => ({ ...prev, failed, logs: [{ ok: false, nama, error: res.reason }, ...prev.logs.slice(0, 49)] }));
        if (res.isRateLimit) {
          toast.error('Dihentikan sementara: Rate limit WA Bot tercapai.');
          break;
        }
      }

      if (i < targetBroadcast.length - 1 && !cancelBulkRef.current) {
        const jeda = Math.floor(Math.random() * 8) + 11;
        for (let s = jeda; s > 0 && !cancelBulkRef.current; s--) {
          setBulkProgress((prev) => ({ ...prev, statusText: `Jeda aman ${s} detik sebelum penerima berikutnya...` }));
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    setIsBulkSending(false);
    setBulkProgress((prev) => ({
      ...prev,
      statusText: `${cancelBulkRef.current ? 'Dihentikan' : 'Selesai'}! Berhasil: ${sent}, Gagal: ${failed}`,
    }));
    toast.success(`Broadcast selesai (Berhasil: ${sent}, Gagal: ${failed})`);
  };

  // Hitung statistik
  const totalPengusul = pengusulList.length;
  const totalSudah = pengusulList.filter((p) => p.is_digunakan).length;
  const totalBelum = totalPengusul - totalSudah;
  const persentase = totalPengusul > 0 ? Math.round((totalSudah / totalPengusul) * 100) : 0;

  const isFase1Aktif = periode?.tgl_selesai_fase1 
    ? new Date() <= new Date(periode.tgl_selesai_fase1)
    : true;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* === BANNER INFORMASI MODE PIONIR === */}
      <div className="rounded-3xl border border-navy-100 bg-gradient-to-br from-navy-900 via-navy-800 to-indigo-950 p-6 sm:p-7 text-white shadow-soft-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-gradient-to-br from-amber-400/15 to-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-5">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/30">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                Fase 1: Penjaringan & Usulan
              </span>
              <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                isFase1Aktif ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
              }`}>
                {isFase1Aktif ? 'Masa Pengusulan Aktif' : 'Masa Pengusulan Berakhir'}
              </span>
            </div>
            
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white">
              Kelola Tim Pengusul PIONIR
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tim Pengusul adalah pegawai yang ditunjuk secara khusus untuk menjaring calon Pionir teladan. Masing-masing pengusul mencalonkan <strong>1 orang rekan kerja</strong> dan menilai 5 kriteria BerAKHLAK (bobot 20%).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {totalBelum > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBulkProgress({ sent: 0, failed: 0, total: 0, statusText: '', logs: [] });
                  setShowBulkModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-teal-400 hover:to-emerald-500 active:scale-95"
              >
                <Send className="h-4 w-4" />
                Kirim Bot WA Massal ({totalBelum})
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-navy-950 shadow-md transition-all hover:shadow-lg hover:from-amber-400 hover:to-amber-500 active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Tambah Pengusul Susulan
            </button>

            {onNavigateNominee && (
              <button
                type="button"
                onClick={onNavigateNominee}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20 border border-white/15"
              >
                <Award className="h-4 w-4" />
                Lihat Bursa Kandidat
              </button>
            )}
          </div>
        </div>

        {/* Progress & Deadline Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pengusul</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalPengusul} <span className="text-xs text-slate-400 font-normal">orang</span></p>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Sudah Mengusulkan</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-2xl font-bold text-emerald-400">{totalSudah}</p>
              <span className="text-xs text-slate-400">({persentase}%)</span>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Belum Mengusulkan</p>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">{totalBelum} <span className="text-xs text-slate-400 font-normal">orang</span></p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Batas Fase 1</p>
            <p className="text-xs font-semibold text-slate-200 mt-1.5 truncate" title={periode?.tgl_selesai_fase1 ? new Date(periode.tgl_selesai_fase1).toLocaleString('id-ID') : 'Belum diatur'}>
              {periode?.tgl_selesai_fase1 ? (
                new Date(periode.tgl_selesai_fase1).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              ) : (
                'Belum diatur'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* === SEARCH & FILTER BAR === */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau NIP pengusul..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'ALL'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua ({totalPengusul})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('SUDAH')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'SUDAH'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Sudah ({totalSudah})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('BELUM')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'BELUM'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
            }`}
          >
            Belum ({totalBelum})
          </button>
        </div>
      </div>

      {/* === DAFTAR TIM PENGUSUL === */}
      {loadingPengusul ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-navy-600" />
          <p className="mt-3 text-sm text-slate-500 font-medium">Memuat data tim pengusul...</p>
        </div>
      ) : filteredPengusul.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 font-semibold text-slate-800">
            {searchQuery ? 'Tidak Ada Pengusul yang Cocok' : 'Belum Ada Tim Pengusul Ditunjuk'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'Coba ganti kata kunci pencarian nama atau NIP.'
              : 'Klik tombol "Tambah Pengusul Susulan" untuk menunjuk pegawai BPS sebagai Tim Pengusul Fase 1.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-navy-800"
            >
              <Plus className="h-4 w-4" />
              Tunjuk Pengusul Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredPengusul.map((p) => {
            const isSudah = Boolean(p.is_digunakan);
            const usulan = usulanByPengusulId.get(p.pegawai_id);

            return (
              <div
                key={p.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                  isSudah 
                    ? 'border-emerald-200/80 bg-emerald-50/20 hover:bg-emerald-50/40' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-soft'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  {/* Profil Pengusul */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={
                        p.pegawai?.foto_url ||
                        (p.pegawai?.nip
                          ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.pegawai.nip}.jpg`
                          : null)
                      }
                      alt={p.pegawai?.nama || 'Pengusul'}
                      className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          p.pegawai?.nama || 'P'
                        )}&background=16324a&color=fff&size=80`;
                      }}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm sm:text-base truncate">
                          {p.pegawai?.nama}
                        </p>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-navy-50 text-navy-700 border border-navy-100 uppercase">
                          Pengusul
                        </span>
                        {isSudah ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Sudah Mengusulkan
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3 text-amber-600" />
                            Belum Mengusulkan
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                        <span>NIP: {p.pegawai?.nip || p.pegawai?.nip_baru || '-'}</span>
                        {p.pegawai?.jabatan && (
                          <span className="inline-flex items-center gap-2 min-w-0">
                            <span>&bull;</span>
                            <span className="truncate">{p.pegawai?.jabatan}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">
                    {/* Tombol Salin Link */}
                    <button
                      type="button"
                      onClick={() => handleCopyLink(p.token_akses, p.pegawai?.nama)}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-navy-300 hover:bg-slate-50 hover:text-navy-900 active:scale-95"
                      title="Salin Tautan Akses Pengusul"
                    >
                      {copiedToken === p.token_akses ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Tersalin
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                          Salin Link
                        </>
                      )}
                    </button>

                    {/* Tombol Bot WA */}
                    <button
                      type="button"
                      disabled={sendingBotId === p.id || isBulkSending || !formatHP(p.pegawai?.no_hp)}
                      onClick={() => handleKirimWABot(p)}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 shadow-sm transition hover:bg-teal-100 hover:border-teal-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={formatHP(p.pegawai?.no_hp) ? `Kirim otomatis via Bot WA (${p.pegawai?.no_hp})` : 'Nomor HP belum terdaftar'}
                    >
                      {sendingBotId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" /> : <Send className="h-3.5 w-3.5 text-teal-600" />}
                      Bot WA
                    </button>

                    {/* Tombol WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleKirimWA(p)}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 hover:border-emerald-300 active:scale-95"
                      title="Bagikan Tautan via WhatsApp"
                    >
                      <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                      Kirim WA
                    </button>

                    {/* Tombol Hapus Pengusul */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(p);
                        setShowDeleteModal(true);
                      }}
                      className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Hapus dari Tim Pengusul"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Informasi Calon yang Diusulkan jika sudah submit */}
                {isSudah && usulan && (
                  <div className="mt-3.5 pt-3 border-t border-emerald-200/60 sm:pl-[3.875rem] space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Award className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>Mencalonkan: <strong>{usulan.kandidatNama}</strong></span>
                      </span>
                      {usulan.kataKunci && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 italic">
                          &ldquo;{usulan.kataKunci}&rdquo;
                        </span>
                      )}
                    </div>
                    {usulan.deskripsiInovasi && (
                      <div className="rounded-xl bg-white/90 border border-amber-200/80 p-3 text-xs text-slate-700">
                        <span className="font-semibold text-amber-800 flex items-center gap-1.5 mb-0.5">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          Inovasi yang Diusulkan:
                        </span>
                        <p className="whitespace-pre-line leading-relaxed text-slate-600">
                          {usulan.deskripsiInovasi}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === MODAL BROADCAST BOT WA MASSAL === */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => !isBulkSending && setShowBulkModal(false)}
        title="Kirim Undangan Pengusul via Bot WA"
      >
        <div className="space-y-4">
          {!isBulkSending && bulkProgress.total === 0 ? (
            <>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kirim tautan rahasia ke seluruh pengusul yang <strong>belum mengusulkan</strong> via Bot WA dengan jeda acak aman <strong>11–18 detik</strong> antar pesan agar terhindar dari blokir WhatsApp.
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Belum mengusulkan:</span>
                  <span className="font-bold text-slate-800">{totalBelum} orang</span>
                </div>
                <div className="flex justify-between text-teal-700">
                  <span>Memiliki Nomor HP valid (Siap dikirim):</span>
                  <span className="font-bold">{targetBroadcast.length} orang</span>
                </div>
                {totalBelum - targetBroadcast.length > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Dilewati (Nomor HP kosong):</span>
                    <span className="font-bold">{totalBelum - targetBroadcast.length} orang</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowBulkModal(false)} className="btn-ghost text-xs">Batal</button>
                <button
                  type="button"
                  disabled={targetBroadcast.length === 0}
                  onClick={handleMulaiBroadcastBot}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Mulai Kirim ({targetBroadcast.length})
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">{bulkProgress.statusText}</span>
                  <span className="text-navy-800">{bulkProgress.sent + bulkProgress.failed} / {bulkProgress.total}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${bulkProgress.total ? Math.round(((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="font-semibold text-emerald-700">Berhasil: {bulkProgress.sent}</span>
                  <span className="font-semibold text-rose-600">Gagal: {bulkProgress.failed}</span>
                </div>
              </div>
              {bulkProgress.logs.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1 text-xs">
                  {bulkProgress.logs.map((log, i) => (
                    <div key={i} className="flex justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 border border-slate-100">
                      <span className="font-medium text-slate-800 truncate">{log.nama}</span>
                      <span className={`shrink-0 text-[11px] font-semibold ${log.ok ? 'text-emerald-600' : 'text-rose-600 truncate max-w-[160px]'}`}>
                        {log.ok ? 'Terkirim' : `Gagal: ${log.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                {isBulkSending ? (
                  <button
                    type="button"
                    onClick={() => { cancelBulkRef.current = true; }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-rose-700"
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    Hentikan
                  </button>
                ) : (
                  <button type="button" onClick={() => setShowBulkModal(false)} className="btn-primary text-xs">Tutup</button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* === MODAL TAMBAH PENGUSUL SUSULAN === */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedPegawaiIds(new Set());
          setModalSearch('');
        }}
        title="Tunjuk Pengusul Susulan"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Pilih satu atau beberapa pegawai dari unit kerja terkait untuk ditunjuk sebagai <strong>Tim Pengusul</strong> pada periode ini.
          </p>

          {/* Search Input Pegawai */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="Cari nama pegawai atau NIP..."
              className="input pl-9 text-xs"
            />
          </div>

          {/* Pegawai List Picker */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
            {loadingPegawaiTersedia ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="mx-auto h-5 w-5 animate-spin mb-2 text-slate-400" />
                Memuat daftar pegawai...
              </div>
            ) : pegawaiBisaDipilih.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {modalSearch ? 'Tidak ada pegawai yang cocok' : 'Seluruh pegawai eligible sudah ditunjuk'}
              </div>
            ) : (
              pegawaiBisaDipilih.map((pg) => {
                const isSelected = selectedPegawaiIds.has(pg.id);

                return (
                  <div
                    key={pg.id}
                    onClick={() => {
                      const next = new Set(selectedPegawaiIds);
                      if (next.has(pg.id)) next.delete(pg.id);
                      else next.add(pg.id);
                      setSelectedPegawaiIds(next);
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      isSelected
                        ? 'border-amber-300 bg-amber-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by container
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />

                    <img
                      src={
                        pg.foto_url ||
                        (pg.nip
                          ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${pg.nip}.jpg`
                          : null)
                      }
                      alt={pg.nama}
                      className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          pg.nama || 'P'
                        )}&background=16324a&color=fff&size=64`;
                      }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-slate-900 truncate">{pg.nama}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {pg.nip || '-'} &bull; {pg.unit_kerja || pg.jabatan || '-'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-700">
              {selectedPegawaiIds.size} pegawai terpilih
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedPegawaiIds(new Set());
                }}
                className="btn-ghost text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={selectedPegawaiIds.size === 0 || mutasiTambah.isPending}
                onClick={() => mutasiTambah.mutate(Array.from(selectedPegawaiIds))}
                className="btn-primary text-xs"
              >
                {mutasiTambah.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Tunjuk {selectedPegawaiIds.size} Pengusul
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* === MODAL KONFIRMASI HAPUS PENGUSUL === */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) {
            mutasiHapus.mutate({
              pengusulRowId: deleteTarget.id,
              pegawaiId: deleteTarget.pegawai_id,
            });
          }
        }}
        title="Hapus Pengusul"
        confirmText="Ya, Hapus Pengusul"
        confirmIcon={<Trash2 className="h-4 w-4" />}
        isLoading={mutasiHapus.isPending}
      >
        {deleteTarget && (
          <div className="space-y-3">
            <p className="text-slate-600 text-sm">
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget.pegawai?.nama}</strong> dari daftar Tim Pengusul?
            </p>
            {deleteTarget.is_digunakan && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                ⚠️ <strong>Peringatan:</strong> Pengusul ini telah mengirimkan usulan. Menghapus pengusul ini akan membatalkan usulan dan nilai kuesioner yang telah dikirimkan.
              </div>
            )}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

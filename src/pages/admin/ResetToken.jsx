/**
 * @fileoverview Halaman reset token penilaian.
 *
 * Admin dapat:
 * - Melihat semua token akses periode
 * - Reset token yang sudah digunakan
 * - Reset juga notifikasi WA
 * - Filter dan cari pegawai
 *
 * @module pages/admin/ResetToken
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Copy,
  CheckCircle,
  Clock,
  MessageCircle,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { fetchPeriodeList, fetchDaftarPegawaiAktif } from '../../services/adminService';
import { resetAksesPenilaiUniversal, fetchSemuaTokenPeriode, blockPenilai } from '../../services/votingService';

import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';

/**
 * Dropdown Select Styled.
 */
function SelectPeriode({ value, onChange, options, placeholder }) {
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
          {selected ? selected.label : placeholder}
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
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  opt.value === value ? 'bg-navy-50 text-navy-800' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <p className="font-medium">{opt.label}</p>
                  {opt.subtitle && <p className="text-xs text-slate-500">{opt.subtitle}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Tabel daftar token.
 */
function TabelToken({ tokenList, onReset, onCopy, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-navy-600" />
      </div>
    );
  }

  if (tokenList.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
        Belum ada token untuk periode ini.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 font-semibold text-slate-600">Nama</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Tipe</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tokenList.map((token) => (
            <tr key={`${token.tipe}-${token.id}`} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={token.foto_url || (token.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${token.nip}.jpg` : null)}
                    alt={token.nama}
                    className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200 bg-white"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(token.nama || 'User')}&background=0D8ABC&color=fff`;
                    }}
                  />
                  <div>
                    <p className="font-medium text-slate-800">{token.nama || '-'}</p>
                    <p className="text-xs text-slate-500">{token.unit_kerja || token.nip_baru || '-'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  token.tipe.includes('Nominee')
                    ? 'bg-emerald-100 text-emerald-700'
                    : token.tipe.includes('Juri')
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {token.tipe}
                </span>
              </td>
              <td className="px-4 py-3">
                {token.is_digunakan ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle className="h-3 w-3" />
                    Sudah Kirim
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Clock className="h-3 w-3" />
                    Belum
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onCopy(token)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    title="Salin link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {token.is_digunakan && (
                    <>
                      <button
                        type="button"
                        onClick={() => onReset(token, 'reset')}
                        className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 hover:text-amber-600 transition"
                        title="Reset token"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onReset(token, 'blok')}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 transition"
                        title="Blok penilai"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Content utama halaman reset token.
 */
function ResetTokenContent({ adminProfile }) {
  const [periodeId, setPeriodeId] = useState('');
  const [tokenDipilih, setTokenDipilih] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [resetNotifikasiWA, setResetNotifikasiWA] = useState(false);
  const [aksiType, setAksiType] = useState('reset'); // 'reset' atau 'blok'
  const [suksesMsg, setSuksesMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const queryClient = useQueryClient();

  // Fetch daftar periode
  const { data: periodeList = [] } = useQuery({
    queryKey: ['periode-list'],
    queryFn: () => fetchPeriodeList(),
  });

  // Fetch semua token periode
  const { data: tokenList = [], isLoading: loadingToken } = useQuery({
    queryKey: ['semua-token-periode', periodeId],
    queryFn: () => fetchSemuaTokenPeriode(Number(periodeId)),
    enabled: Boolean(periodeId),
  });

  // Reset mutation
  const mutasiReset = useMutation({
    mutationFn: () => resetAksesPenilaiUniversal(
      Number(periodeId),
      tokenDipilih.pegawai_id,
      adminProfile.id,
      tokenDipilih.tipe,
      resetNotifikasiWA
    ),
    onSuccess: () => {
      const msg = resetNotifikasiWA
        ? `Token & notifikasi WA atas nama ${tokenDipilih?.nama || '-'} berhasil direset!`
        : `Token atas nama ${tokenDipilih?.nama || '-'} berhasil direset!`;
      toast.success(msg);
      setSuksesMsg(msg);
      setErrorMsg(null);
      setTokenDipilih(null);
      setIsConfirmOpen(false);
      setResetNotifikasiWA(false);
      queryClient.invalidateQueries({ queryKey: ['semua-token-periode', periodeId] });
    },
    onError: (err) => {
      setErrorMsg(`Gagal mereset: ${err.message}`);
      toast.error(err.message);
      setTokenDipilih(null);
      setIsConfirmOpen(false);
    },
  });

  // Block mutation
  const mutasiBlock = useMutation({
    mutationFn: () => blockPenilai(
      Number(periodeId),
      tokenDipilih.pegawai_id,
      tokenDipilih.tipe
    ),
    onSuccess: () => {
      toast.success(`Token ${tokenDipilih?.nama || '-'} berhasil diblokir!`);
      setSuksesMsg(`Token ${tokenDipilih?.nama || '-'} berhasil diblokir!`);
      setErrorMsg(null);
      setTokenDipilih(null);
      setIsConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['semua-token-periode', periodeId] });
    },
    onError: (err) => {
      setErrorMsg(`Gagal memblokir: ${err.message}`);
      toast.error(err.message);
      setTokenDipilih(null);
      setIsConfirmOpen(false);
    },
  });

  // Pilihan dropdown periode
  const periodeOptions = periodeList.map((p) => ({
    value: p.id,
    label: p.nama_periode,
    subtitle: `${p.status} · ${new Date(p.tgl_mulai).toLocaleDateString('id-ID')} - ${new Date(p.tgl_selesai).toLocaleDateString('id-ID')}`,
  }));

  // Statistik
  const totalToken = tokenList.length;
  const sudahDigunakan = tokenList.filter((t) => t.is_digunakan).length;

  function handleCopy(tokenObj) {
    let path = '';
    const tipeLower = tokenObj.tipe.toLowerCase();
    if (tipeLower.includes('penilai')) path = '/penilai';
    else if (tipeLower.includes('juri')) path = '/juri';
    else if (tipeLower.includes('nominee')) path = '/nominee';

    const url = `${window.location.origin}${path}?token=${tokenObj.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tokenObj.token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleReset(token, type = 'reset') {
    setTokenDipilih(token);
    setAksiType(type);
    setIsConfirmOpen(true);
  }

  function handleConfirmReset() {
    setIsConfirmOpen(false);
    setSuksesMsg(null);
    setErrorMsg(null);
    if (aksiType === 'blok') {
      mutasiBlock.mutate();
    } else {
      mutasiReset.mutate();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <RotateCcw className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Reset Token</h1>
          <p className="text-sm text-slate-500">Kelola dan reset token penilaian</p>
        </div>
      </div>

      {/* Filter Periode */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <label className="mb-2 block text-sm font-medium text-slate-700">Pilih Periode</label>
        <SelectPeriode
          value={periodeId}
          onChange={(val) => {
            setPeriodeId(val);
            setTokenDipilih(null);
            setSuksesMsg(null);
            setErrorMsg(null);
          }}
          options={periodeOptions}
          placeholder="-- Pilih Periode --"
        />

        {/* Statistik */}
        {periodeId && (
          <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-navy-800">{totalToken}</p>
              <p className="text-xs text-slate-500">Total Token</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{sudahDigunakan}</p>
              <p className="text-xs text-slate-500">Sudah Kirim</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{totalToken - sudahDigunakan}</p>
              <p className="text-xs text-slate-500">Belum Kirim</p>
            </div>
          </div>
        )}
      </div>

      {/* Error/Success Messages */}
      {periodeId && (
        <>
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              {errorMsg}
            </div>
          )}
          {suksesMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {suksesMsg}
            </div>
          )}
        </>
      )}

      {/* Tabel Token */}
      {periodeId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-navy-900">Daftar Token</h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <RotateCcw className="h-3 w-3 text-amber-500" /> Reset = buka token lagi
              </span>
              <span className="flex items-center gap-1">
                <Ban className="h-3 w-3 text-red-500" /> Blok = hapus token permanen
              </span>
            </div>
          </div>
          <TabelToken
            tokenList={tokenList}
            loading={loadingToken}
            onCopy={handleCopy}
            onReset={handleReset}
          />
        </div>
      )}

      {/* Petunjuk */}
      {!periodeId && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <RotateCcw className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Pilih periode untuk melihat token</p>
          <p className="mt-1 text-sm text-slate-400">
            Reset = hapus jawaban + buka token lagi<br />
            Blok = hapus jawaban + hapus token permanen
          </p>
        </div>
      )}

      {/* Confirm Modal untuk Reset atau Blok */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-soft-xl">
            <div className="p-6 text-center">
              {aksiType === 'blok' ? (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Ban className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Konfirmasi Blok Penilai</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {tokenDipilih?.nama || '-'} ({tokenDipilih?.tipe || '-'})
                  </p>
                  <p className="mt-2 text-sm text-red-600">
                    ⚠️ Token akan dihapus permanen! Orang ini tidak bisa voting lagi.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Jawaban voting mereka tetap akan dihapus.
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <RotateCcw className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Konfirmasi Reset Token</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {tokenDipilih?.nama || '-'} ({tokenDipilih?.tipe || '-'})
                  </p>
                  <p className="mt-2 text-sm text-red-600">
                    Semua skor atau jawaban yang telah dikirim akan dihapus.
                  </p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={resetNotifikasiWA}
                      onChange={(e) => setResetNotifikasiWA(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                    />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-700">Reset juga Notifikasi WA</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Centang ini agar notifikasi WA bisa dikirim ulang.
                      </p>
                    </div>
                  </label>
                </>
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-100 p-4">
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setTokenDipilih(null);
                  setResetNotifikasiWA(false);
                }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={mutasiReset.isPending || mutasiBlock.isPending}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  aksiType === 'blok'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {mutasiReset.isPending || mutasiBlock.isPending ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : aksiType === 'blok' ? (
                  'Blok Sekarang'
                ) : (
                  'Reset Sekarang'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResetToken() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <div className="max-w-4xl mx-auto py-6">
            <ResetTokenContent adminProfile={adminProfile} />
          </div>
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

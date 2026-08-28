/**
 * @fileoverview Halaman manajemen nominee (calon penerima penilaian).
 *
 * Admin dapat:
 * - Memilih periode penilaian
 * - Search & filter pegawai
 * - Bulk tambah nominee dengan checkbox
 * - Tambah 1 nominee dengan tombol quick add
 * - Melihat & hapus nominee dari periode
 *
 * CATATAN: Halaman ini hanya CONTENT, dibungkus oleh AdminLoginGate & AdminLayout.
 *
 * @module pages/admin/KelolaNominee
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, CheckCircle2, Clock, Loader2, UserCheck, Plus, Users, CheckSquare, Square, UserPlus, Edit3 } from 'lucide-react';

import { fetchPeriodeList, fetchUnitKerjaPeriode, fetchDaftarPegawaiAktifMultiUnit, fetchWilayahList } from '../../services/adminService';
import { fetchNomineeByPeriode, tambahNominee, hapusNominee } from '../../services/voting/nomineeService';
import { filterByKlasifikasiJabatan, isUpperRank, MODE_PENILAIAN } from '../../utils/constants';
import toast from 'react-hot-toast';

import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';
import ConfirmModal from '../../components/common/ConfirmModal';
import ModalEditProfilNominee from './components/ModalEditProfilNominee';

export function KelolaNomineeContent({ adminProfile, periodeId }) {
  const isKabKotaAdmin = adminProfile?.role_admin === 'ADMIN_KABKOTA';
  const isProvinsiAdmin = adminProfile?.role_admin === 'ADMIN_PROVINSI';
  const adminWilayahId = isKabKotaAdmin ? Number(adminProfile?.wilayah_id) : null;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPegawaiIds, setSelectedPegawaiIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [suksesMsg, setSuksesMsg] = useState(null);
  const [isUpperRankOnly, setIsUpperRankOnly] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [singleNominee, setSingleNominee] = useState(null);
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [editNomineeData, setEditNomineeData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch data
  const { data: rawPeriodeList = [] } = useQuery({
    queryKey: ['periode-list'],
    queryFn: () => fetchPeriodeList(),
  });

  const { data: wilayahList = [] } = useQuery({
    queryKey: ['wilayah-list'],
    queryFn: fetchWilayahList,
    enabled: isProvinsiAdmin
  });

  const validWilayahIds = useMemo(() => {
    if (!isProvinsiAdmin) return null;
    return new Set(wilayahList
      .filter(w => String(w.id) === String(adminProfile.wilayah_id) || String(w.parent_id) === String(adminProfile.wilayah_id))
      .map(w => String(w.id))
    );
  }, [wilayahList, adminProfile, isProvinsiAdmin]);

  const periodeList = useMemo(() => {
    if (isKabKotaAdmin) {
      return rawPeriodeList.filter(p => Number(p.wilayah_id) === adminWilayahId);
    }
    if (isProvinsiAdmin && validWilayahIds) {
      return rawPeriodeList.filter(p => validWilayahIds.has(String(p.wilayah_id)));
    }
    return rawPeriodeList;
  }, [rawPeriodeList, isKabKotaAdmin, adminWilayahId, isProvinsiAdmin, validWilayahIds]);

  const periode = periodeList.find((p) => p.id === Number(periodeId));

  const { data: unitKerjaList = [] } = useQuery({
    queryKey: ['unit-kerja-periode', periodeId],
    queryFn: () => fetchUnitKerjaPeriode(Number(periodeId)),
    enabled: Boolean(periodeId),
  });

  const wilayahIds = unitKerjaList.map((u) => u.wilayah_id);

  const { data: nomineeList = [], isLoading: loadingNominee } = useQuery({
    queryKey: ['nominee-periode', Number(periodeId)],
    queryFn: () => fetchNomineeByPeriode(Number(periodeId)),
    enabled: Boolean(periodeId),
  });

  const { data: seluruhPegawai = [], isLoading: loadingPegawai } = useQuery({
    queryKey: ['seluruh-pegawai-nominee-multi', periodeId, wilayahIds],
    queryFn: () => fetchDaftarPegawaiAktifMultiUnit(wilayahIds, ''),
    enabled: Boolean(periodeId) && wilayahIds.length > 0,
  });

  // Filter
  const nomineePegawaiIds = new Set(nomineeList.map((n) => n.pegawai_id || n.pegawai?.id));
  const allPegawai = filterByKlasifikasiJabatan(seluruhPegawai, 'ALL');

  const filteredByRank = isUpperRankOnly
    ? allPegawai
    : allPegawai.filter((p) => !isUpperRank(p.jabatan));

  const filteredPegawai = searchQuery.trim()
    ? filteredByRank.filter((p) =>
        p.nama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nip?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nip_baru?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.unit_kerja?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByRank;

  const pegawaiTersedia = filteredPegawai.filter((p) => !nomineePegawaiIds.has(p.id));
  const pegawaiSudahNominee = filteredPegawai.filter((p) => nomineePegawaiIds.has(p.id));

  // Handlers
  const mode = periode?.mode_penilaian;
  const isLimitedMode = mode === MODE_PENILAIAN.MODE_1A || mode === MODE_PENILAIAN.MODE_2;
  const maxNominee = periode?.max_nominee || 10;
  const remainingSlots = isLimitedMode ? Math.max(0, maxNominee - nomineeList.length) : Infinity;

  const handleSelectAll = () => {
    if (selectedPegawaiIds.size === pegawaiTersedia.length) {
      setSelectedPegawaiIds(new Set());
    } else {
      if (isLimitedMode) {
        if (remainingSlots <= 0) {
          toast.error(`Batas nominee (${maxNominee}) sudah tercapai.`);
          return;
        }
        const ids = pegawaiTersedia.slice(0, remainingSlots).map((p) => p.id);
        setSelectedPegawaiIds(new Set(ids));
        if (pegawaiTersedia.length > remainingSlots) {
          toast.info(`Hanya terpilih ${remainingSlots} orang karena sisa kuota.`);
        }
      } else {
        setSelectedPegawaiIds(new Set(pegawaiTersedia.map((p) => p.id)));
      }
    }
  };

  const handleToggleSelect = (id) => {
    const newSelected = new Set(selectedPegawaiIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (isLimitedMode && (newSelected.size + 1) > remainingSlots) {
        toast.error(`Sisa kuota nominee hanya ${remainingSlots}.`);
        return;
      }
      newSelected.add(id);
    }
    setSelectedPegawaiIds(newSelected);
  };

  const isAllSelected = pegawaiTersedia.length > 0 && selectedPegawaiIds.size === pegawaiTersedia.length;

  const selectedPegawaiData = useMemo(() => {
    return Array.from(selectedPegawaiIds).map((id) => {
      const p = pegawaiTersedia.find((pg) => pg.id === id);
      return p || seluruhPegawai.find((pg) => pg.id === id);
    }).filter(Boolean);
  }, [selectedPegawaiIds, pegawaiTersedia, seluruhPegawai]);

  // Mutations
  const mutasiTambah = useMutation({
    mutationFn: (pegawaiId) => tambahNominee(Number(periodeId), pegawaiId),
    onSuccess: () => {
      setShowSingleModal(false);
      setSingleNominee(null);
      setError(null);
      setSuksesMsg('Nominee berhasil ditambahkan!');
      setTimeout(() => setSuksesMsg(null), 3000);
      const pid = Number(periodeId);
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', pid] });
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', String(pid)] });
      queryClient.invalidateQueries({ queryKey: ['daftar-nominee'] }); // voting page
    },
    onError: (err) => {
      setSuksesMsg(null);
      setError(err.message);
    },
  });

  const mutasiBulkTambah = useMutation({
    mutationFn: async (pegawaiIds) => {
      setBulkLoading(true);
      const results = { success: 0, failed: 0 };
      for (const pgId of pegawaiIds) {
        try {
          await tambahNominee(Number(periodeId), pgId);
          results.success++;
        } catch (err) {
          results.failed++;
        }
      }
      return results;
    },
    onSuccess: (results) => {
      setBulkLoading(false);
      setShowBulkModal(false);
      setSelectedPegawaiIds(new Set());
      setSuksesMsg(
        results.failed === 0
          ? `Berhasil menjadikan ${results.success} nominee!`
          : `${results.success} berhasil, ${results.failed} gagal.`
      );
      setTimeout(() => setSuksesMsg(null), 5000);
      const pid = Number(periodeId);
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', pid] });
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', String(pid)] });
      queryClient.invalidateQueries({ queryKey: ['daftar-nominee'] }); // voting page
    },
    onError: (err) => {
      setBulkLoading(false);
      setError(err.message);
    },
  });

  const mutasiHapus = useMutation({
    mutationFn: (pegawaiId) => hapusNominee(Number(periodeId), pegawaiId),
    onSuccess: () => {
      // Invalidate semua query terkait nominee
      const pid = Number(periodeId);
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', pid] });
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', String(pid)] });
      queryClient.invalidateQueries({ queryKey: ['daftar-nominee'] }); // voting page
      queryClient.invalidateQueries({ queryKey: ['rekap-kakan'] }); // dashboard
      queryClient.invalidateQueries({ queryKey: ['voting-kategori-admin'] });
      setSuksesMsg('Nominee dihapus.');
      setTimeout(() => setSuksesMsg(null), 3000);
    },
    onError: (err) => setError(err.message),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {suksesMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <strong>Sukses:</strong> {suksesMsg}
        </div>
      )}

      {/* === GABUNGAN: SEARCH + FILTER + CHECKBOX === */}
      <div className="rounded-2xl border border-navy-200/50 bg-white p-5 shadow-soft">
        {/* Header dengan Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIP, atau unit kerja..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="text-sm text-slate-600 whitespace-nowrap">Upper Rank</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isUpperRankOnly}
                onChange={(e) => setIsUpperRankOnly(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Info Stats */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-slate-500">
            {searchQuery ? (
              <>
                Ditemukan <strong>{filteredPegawai.length}</strong> dari <strong>{allPegawai.length}</strong> pegawai
              </>
            ) : (
              <>
                <strong>{allPegawai.length}</strong> pegawai tersedia
                {!isUpperRankOnly && allPegawai.filter((p) => isUpperRank(p.jabatan)).length > 0 && (
                  <span className="text-slate-400 ml-1">(Upper: {allPegawai.filter((p) => isUpperRank(p.jabatan)).length})</span>
                )}
              </>
            )}
            {pegawaiSudahNominee.length > 0 && (
              <span className="ml-2 text-emerald-600">
                • {pegawaiSudahNominee.length} sudah nominee
              </span>
            )}
          </div>

          {pegawaiTersedia.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium"
            >
              {isAllSelected ? (
                <>
                  <Square className="h-4 w-4" />
                  Batal Semua
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Pilih Semua ({pegawaiTersedia.length})
                </>
              )}
            </button>
          )}
        </div>

        {/* Bulk Action Buttons */}
        {selectedPegawaiIds.size > 0 && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              disabled={bulkLoading}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
            >
              {bulkLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Jadikan {selectedPegawaiIds.size} sebagai Nominee
                </span>
              )}
            </button>
          </div>
        )}

        {/* Pegawai List */}
        {pegawaiTersedia.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-400">
            {searchQuery ? 'Tidak ada pegawai yang cocok dengan pencarian' : 'Semua pegawai sudah menjadi nominee'}
          </div>
        ) : loadingPegawai ? (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">Memuat daftar pegawai...</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {pegawaiTersedia.map((p) => {
              const isSelected = selectedPegawaiIds.has(p.id);
              const isUpper = isUpperRank(p.jabatan);

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(p.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />

                  <img
                    src={p.foto_url || (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null)}
                    alt={p.nama}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama || 'P')}&background=16324a&color=fff&size=64`;
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{p.nama}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500 truncate">{p.unit_kerja}</p>
                      {p.jabatan && isUpper && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          Upper
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isLimitedMode && remainingSlots <= 0) {
                        toast.error(`Batas nominee (${maxNominee}) sudah tercapai.`);
                        return;
                      }
                      setSingleNominee(p);
                      setShowSingleModal(true);
                    }}
                    className="shrink-0 rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 transition"
                    title="Tambah jadi nominee"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === DAFTAR NOMINEE EXISTING === */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="mb-4 font-semibold text-navy-900">
          Daftar Nominee ({nomineeList.length})
        </h2>

        <div className="space-y-2">
          {loadingNominee ? (
            <div className="py-6 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : nomineeList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-400">
              Belum ada nominee
            </div>
          ) : (
            nomineeList.map((n) => {
              const isUpper = isUpperRank(n.pegawai?.jabatan);
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-all hover:bg-slate-50"
                >
                  <img
                    src={n.pegawai?.foto_url || (n.pegawai?.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.pegawai.nip}.jpg` : null)}
                    alt={n.pegawai?.nama}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.pegawai?.nama || 'N')}&background=16324a&color=fff&size=64`;
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{n.pegawai?.nama}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500 truncate">{n.pegawai?.unit_kerja}</p>
                      {n.pegawai?.jabatan && (
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${
                            isUpper ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                          title={n.pegawai?.jabatan}
                        >
                          {isUpper ? 'Upper' : 'Non-Upper'}
                        </span>
                      )}
                    </div>
                  </div>

                  {n.akses?.is_digunakan ? (
                    <span className="badge badge-success">
                      <CheckCircle2 className="h-3 w-3" /> Lengkap
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      <Clock className="h-3 w-3" /> Menunggu
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditNomineeData(n);
                        setShowEditModal(true);
                      }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-navy-50 hover:text-navy-600 transition"
                      title="Edit Profil Tambahan"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus "${n.pegawai?.nama}"?`)) {
                          mutasiHapus.mutate(n.pegawai_id);
                        }
                      }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Hapus dari nominee"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* === MODAL BULK === */}
      <ConfirmModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onConfirm={() => mutasiBulkTambah.mutate(Array.from(selectedPegawaiIds))}
        title="Konfirmasi Bulk Nominee"
        confirmText={bulkLoading ? "Memproses..." : `Ya, Jadikan ${selectedPegawaiIds.size} Pegawai`}
        confirmIcon={bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        isLoading={bulkLoading}
      >
        <div className="space-y-3">
          <p className="text-slate-600">
            Anda akan menjadikan <strong className="text-navy-900">{selectedPegawaiIds.size} pegawai</strong> sebagai nominee.
          </p>

          {selectedPegawaiData.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
              {selectedPegawaiData.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{p.nama}</span>
                  <span className="text-xs text-slate-400 shrink-0">({p.unit_kerja})</span>
                </div>
              ))}
              {selectedPegawaiData.length > 10 && (
                <p className="text-xs text-slate-500 pt-1">
                  ...dan {selectedPegawaiData.length - 10} lainnya
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-800">
              ⚠️ <strong>Peringatan:</strong> Duplikat akan dilewati otomatis.
            </p>
          </div>
        </div>
      </ConfirmModal>

      {/* === MODAL SINGLE ADD === */}
      <ConfirmModal
        isOpen={showSingleModal}
        onClose={() => { setShowSingleModal(false); setSingleNominee(null); }}
        onConfirm={() => singleNominee && mutasiTambah.mutate(singleNominee.id)}
        title="Tambah Nominee"
        confirmText="Ya, Jadikan Nominee"
        confirmIcon={<Plus className="h-4 w-4" />}
        isLoading={mutasiTambah.isPending}
      >
        {singleNominee && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
              <img
                src={singleNominee.foto_url || (singleNominee.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${singleNominee.nip}.jpg` : null)}
                alt={singleNominee.nama}
                className="h-12 w-12 rounded-full object-cover border border-slate-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(singleNominee.nama || 'P')}&background=16324a&color=fff&size=96`;
                }}
              />
              <div>
                <p className="font-semibold text-slate-900">{singleNominee.nama}</p>
                <p className="text-sm text-slate-500">{singleNominee.unit_kerja}</p>
                {isUpperRank(singleNominee.jabatan) && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                    Upper
                  </span>
                )}
              </div>
            </div>
            <p className="text-slate-600">
              Jadikan <strong>{singleNominee.nama}</strong> sebagai nominee untuk periode <strong>{periode?.nama_periode}</strong>?
            </p>
          </div>
        )}
      </ConfirmModal>

      {/* === MODAL EDIT PROFIL NOMINEE === */}
      <ModalEditProfilNominee
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditNomineeData(null); }}
        nominee={editNomineeData}
        periodeId={periodeId}
        isTabelKehadiranEnabled={periode?.is_tabel_kehadiran}
        isVideoProfilEnabled={periode?.is_video_profil}
        isPortofolioPengembanganEnabled={periode?.is_portofolio_pengembangan}
        isPortofolioInovasiEnabled={periode?.is_portofolio_inovasi}
        isPortofolioPenghargaanEnabled={periode?.is_portofolio_penghargaan}
      />
    </div>
  );
}

export default function KelolaNominee() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <div className="max-w-2xl mx-auto py-6">
            <h1 className="font-display text-2xl font-bold text-navy-900 mb-6">Kelola Nominee</h1>
            <KelolaNomineeContent adminProfile={adminProfile} />
          </div>
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FilePlus2, ListFilter, Calendar, Activity, ChevronRight, UserCheck, FileSignature, Gavel, Edit2, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import Modal from '../../../components/common/Modal';

import AdminLoginGate from '../components/AdminLoginGate';
import AdminLayout from '../components/AdminLayout';

import { fetchPeriodeList, updatePeriodePenilaian, hapusPeriodePenilaian, fetchWilayahList } from '../../../services/adminService';
import { MODE_PENILAIAN, MODE_PENILAIAN_LABEL } from '../../../utils/constants';

import { BuatPeriodeWizard } from '../BuatPeriode';
import { KelolaNomineeContent } from '../KelolaNominee';
import { PartisipanPeriodeContent } from '../PartisipanPeriode';

function InfoDasarPeriode({ periode }) {
  if (!periode) return null;
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-soft-lg rounded-[1.5rem] p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8 border-b border-slate-200/50 pb-5">
           <div className="bg-gradient-to-br from-navy-700 to-navy-900 p-3 rounded-2xl shadow-md">
             <Activity className="h-6 w-6 text-white" />
           </div>
           <div>
             <h3 className="font-display font-bold text-xl text-navy-900 tracking-tight">Informasi Utama</h3>
             <p className="text-xs text-slate-500 font-medium">Rincian pengaturan periode berjalan</p>
           </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Nama Periode</p>
            <p className="text-base font-bold text-navy-900 leading-snug">{periode.nama_periode}</p>
          </div>
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Status</p>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${
              periode.status === 'AKTIF' || periode.status === 'BERJALAN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              {periode.status}
            </span>
          </div>
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Mode Penilaian</p>
            <p className="text-base font-bold text-navy-900">{MODE_PENILAIAN_LABEL[periode.mode_penilaian]}</p>
          </div>
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Jadwal Pelaksanaan</p>
            <p className="text-sm font-bold text-navy-900">
              {new Date(periode.tgl_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
              <span className="text-slate-400 mx-2 font-normal">s/d</span> 
              {new Date(periode.tgl_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 transition-all hover:bg-white hover:shadow-sm">
            <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Hak Pilih Nominee</p>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase ${
              periode.is_nominee_can_vote !== false ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              {periode.is_nominee_can_vote !== false ? 'DIBERIKAN HAK VOTING' : 'TIDAK BERHAK VOTING'}
            </span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200/50">
          <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Petunjuk Penilaian</p>
          <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100/50">
             <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed font-medium">{periode.petunjuk_penilaian || <span className="text-slate-400 italic">Tidak ada petunjuk khusus</span>}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManajemenPeriodeContent({ adminProfile }) {
  const isKabKotaAdmin = adminProfile?.role_admin === 'ADMIN_KABKOTA';
  const isProvinsiAdmin = adminProfile?.role_admin === 'ADMIN_PROVINSI';
  const adminWilayahId = isKabKotaAdmin ? Number(adminProfile?.wilayah_id) : null;
  const queryClient = useQueryClient();

  const [activePeriodeId, setActivePeriodeId] = useState(null); // null = Buat Baru
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'nominee', 'partisipan'

  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editForm, setEditForm] = useState({
    id: null,
    nama_periode: '',
    tgl_mulai: '',
    tgl_selesai: '',
    petunjuk_penilaian: '',
    status: 'DRAFT',
    is_nominee_can_vote: true,
    is_allow_abstain: false,
  });

  const mutasiEdit = useMutation({
    mutationFn: (payload) => updatePeriodePenilaian(editForm.id, payload),
    onSuccess: () => {
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['periode-list'] });
      toast.success('Periode berhasil diupdate.');
    },
    onError: (err) => toast.error(`Gagal mengedit periode: ${err.message}`),
  });

  const mutasiHapus = useMutation({
    mutationFn: (id) => hapusPeriodePenilaian(id),
    onSuccess: () => {
      setActivePeriodeId(null);
      queryClient.invalidateQueries({ queryKey: ['periode-list'] });
      toast.success(`Periode "${deleteTarget?.nama_periode}" berhasil dihapus.`);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(`Gagal menghapus periode: ${err.message}`);
      setDeleteTarget(null);
    },
  });

  function handleDeleteClick(p) {
    setDeleteTarget(p);
    setShowDeleteModal(true);
  }

  function confirmDelete() {
    setShowDeleteModal(false);
    mutasiHapus.mutate(deleteTarget.id);
  }

  function bukaModalEdit(p) {
    setEditForm({
      id: p.id,
      nama_periode: p.nama_periode || '',
      tgl_mulai: p.tgl_mulai ? p.tgl_mulai.substring(0, 16) : '',
      tgl_selesai: p.tgl_selesai ? p.tgl_selesai.substring(0, 16) : '',
      petunjuk_penilaian: p.petunjuk_penilaian || '',
      status: p.status || 'DRAFT',
      is_nominee_can_vote: p.is_nominee_can_vote ?? true,
      is_allow_abstain: p.is_allow_abstain ?? false,
    });
    setShowEditModal(true);
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    const { id, ...payload } = editForm;
    mutasiEdit.mutate(payload);
  }

  const filterWilayahId = isKabKotaAdmin ? adminWilayahId : null;
  // Fetch periode list
  const { data: rawPeriodeList = [], isLoading } = useQuery({ 
    queryKey: ['periode-list', filterWilayahId], 
    queryFn: () => fetchPeriodeList(filterWilayahId) 
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

  const activePeriode = activePeriodeId 
    ? periodeList.find(p => p.id === activePeriodeId) 
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* Sidebar Kiri: Daftar Periode */}
        <aside className="flex flex-1 md:flex-none md:w-72 shrink-0 flex-col gap-4">
          <button
            onClick={() => {
              setActivePeriodeId(null);
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-[1.5rem] p-4 text-left transition-all duration-300 ${
              activePeriodeId === null 
                ? 'bg-gradient-to-r from-navy-700 to-navy-900 text-white shadow-soft-lg hover:shadow-glow hover:-translate-y-0.5 border border-navy-500/30' 
                : 'bg-white/70 backdrop-blur-md border border-white/60 text-slate-700 hover:border-navy-300 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 transition-colors ${activePeriodeId === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-navy-600 shadow-inner-soft'}`}>
                <FilePlus2 className="h-5 w-5" />
              </div>
              <div>
                <p className={`font-bold ${activePeriodeId === null ? 'text-white' : 'text-slate-800'}`}>
                  Buat Baru
                </p>
                <p className={`text-[10px] ${activePeriodeId === null ? 'text-navy-100' : 'text-slate-500 font-medium'}`}>Periode Penilaian</p>
              </div>
            </div>
            {activePeriodeId === null && <ChevronRight className="h-5 w-5 text-white/70" />}
          </button>

          <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-[1.5rem] flex flex-col min-h-0 overflow-hidden shadow-soft-lg">
            <div className="bg-gradient-to-r from-navy-50/50 to-transparent p-4 border-b border-white/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100/50">
                  <ListFilter className="h-4 w-4 text-navy-600" />
                </div>
                <h2 className="text-xs font-bold text-navy-900 uppercase tracking-widest">Daftar Periode</h2>
              </div>
              <span className="bg-white text-navy-700 shadow-sm border border-navy-100/50 py-0.5 px-2.5 rounded-full text-[10px] font-bold">{periodeList.length}</span>
            </div>

            {/* Desktop: scrollable, Mobile: max 3 items + scroll */}
            <div className="hidden sm:flex sm:flex-col sm:flex-1 sm:overflow-y-auto p-2 space-y-1 max-h-[calc(100vh-220px)] custom-scrollbar">
              {isLoading ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">Memuat data...</div>
              ) : periodeList.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-slate-400">Belum ada periode.</div>
              ) : (
                periodeList.map(p => {
                  const isActive = activePeriodeId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePeriodeId(p.id);
                        setActiveTab('info');
                      }}
                      className={`group flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border border-transparent transition-all duration-300 cursor-pointer relative overflow-hidden ${
                        isActive
                          ? 'bg-white shadow-md border-navy-200'
                          : 'hover:bg-white/50 hover:shadow-sm'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-navy-400 to-navy-600 rounded-r-md"></div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {/* Nama Periode */}
                        <div className="flex items-center gap-2 mb-1.5">
                           <span className={`font-bold text-sm truncate ${isActive ? 'text-navy-900' : 'text-slate-700'}`}>{p.nama_periode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <span className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                            isActive ? 'bg-navy-50 text-navy-700 border border-navy-100' : 'bg-slate-100/50 text-slate-500 border border-slate-200/50'
                          }`}>
                            {p.status}
                          </span>
                          {/* Mode Penilaian */}
                          <span className={`text-[10px] hidden sm:block truncate ${isActive ? 'text-navy-600/70 font-medium' : 'text-slate-400'}`}>
                            &bull; {MODE_PENILAIAN_LABEL[p.mode_penilaian]}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            bukaModalEdit(p);
                          }}
                          className={`p-2 rounded-xl transition-all ${isActive ? 'bg-navy-50 text-navy-600 hover:bg-navy-600 hover:text-white' : 'bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-navy-600 hover:border-navy-300'}`}
                          title="Edit Periode"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(p);
                          }}
                          className={`p-2 rounded-xl transition-all ${isActive ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300'}`}
                          title="Hapus Periode"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile: max 3 items */}
            <div className="sm:hidden flex-1 overflow-y-auto p-2 space-y-1 max-h-64">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">Memuat...</div>
              ) : periodeList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Belum ada periode.</div>
              ) : (
                periodeList.slice(0, 3).map(p => {
                  const isActive = activePeriodeId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePeriodeId(p.id);
                        setActiveTab('info');
                      }}
                      className={`group flex items-center gap-3 w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                        isActive
                          ? 'bg-navy-50/50'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-navy-600 rounded-r-md"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Nama Periode */}
                        <div className="flex items-center gap-2 mb-1">
                           <span className={`font-semibold text-sm truncate ${isActive ? 'text-navy-900' : 'text-slate-700'}`}>{p.nama_periode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Status Badge */}
                          <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                            isActive ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            bukaModalEdit(p);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-white shadow-sm text-navy-600 hover:bg-navy-600 hover:text-white' : 'bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-navy-600 hover:border-navy-300'}`}
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(p);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-white shadow-sm text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white shadow-sm border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300'}`}
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              {periodeList.length > 3 && (
                <p className="text-center text-[10px] text-slate-400 py-2">
                  +{periodeList.length - 3} periode lainnya
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Konten Kanan */}
        <div className="flex-1 min-w-0">
          {activePeriodeId === null ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-4">
                <h1 className="font-display text-2xl font-bold text-navy-900">Buat Periode Baru</h1>
                <p className="text-sm text-slate-500">Ikuti langkah-langkah di bawah untuk memulai penilaian baru.</p>
              </div>
              <BuatPeriodeWizard 
                adminProfile={adminProfile} 
                onSuccess={(newId) => {
                  setActivePeriodeId(newId);
                  setActiveTab('info');
                }} 
              />
            </div>
          ) : activePeriode ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-navy-900 mb-1.5">{activePeriode.nama_periode}</h1>
                  <div className="flex items-center gap-2">
                     <span className="badge badge-primary">{MODE_PENILAIAN_LABEL[activePeriode.mode_penilaian]}</span>
                     <span className={`badge ${activePeriode.status === 'AKTIF' || activePeriode.status === 'BERJALAN' ? 'badge-success' : 'badge-warning'}`}>{activePeriode.status}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-6 flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`tab ${activeTab === 'info' ? 'tab-active' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <Calendar className="h-4 w-4" /> Info Dasar
                </button>
                <button
                  onClick={() => setActiveTab('nominee')}
                  className={`tab ${activeTab === 'nominee' ? 'tab-active' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  <UserCheck className="h-4 w-4" /> Kandidat / Nominee
                </button>
                <button
                  onClick={() => setActiveTab('partisipan')}
                  className={`tab ${activeTab === 'partisipan' ? 'tab-active' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {activePeriode.mode_penilaian === MODE_PENILAIAN.MODE_2 ? <Gavel className="h-4 w-4" /> : <FileSignature className="h-4 w-4" />} 
                  Partisipan & Token
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === 'info' && <InfoDasarPeriode periode={activePeriode} />}
                {activeTab === 'nominee' && <KelolaNomineeContent adminProfile={adminProfile} periodeId={activePeriode.id} />}
                {activeTab === 'partisipan' && <PartisipanPeriodeContent adminProfile={adminProfile} periode={activePeriode} />}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center text-slate-500">Periode tidak ditemukan.</div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Periode Penilaian"
      >
        <form onSubmit={handleSaveEdit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Nama Periode</label>
            <input
              type="text"
              required
              value={editForm.nama_periode}
              onChange={(e) => setEditForm({ ...editForm, nama_periode: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tanggal Mulai</label>
              <input
                type="datetime-local"
                required
                value={editForm.tgl_mulai}
                onChange={(e) => setEditForm({ ...editForm, tgl_mulai: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tanggal Selesai</label>
              <input
                type="datetime-local"
                required
                value={editForm.tgl_selesai}
                onChange={(e) => setEditForm({ ...editForm, tgl_selesai: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Status Periode</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="input"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="BERJALAN">BERJALAN (AKTIF)</option>
              <option value="SELESAI">SELESAI</option>
              <option value="DIARSIPKAN">DIARSIPKAN</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Nominee Berhak Voting</label>
              <p className="text-xs text-slate-500">Jika aktif, nominee akan otomatis di-generate sebagai Penilai.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={editForm.is_nominee_can_vote} onChange={(e) => setEditForm({ ...editForm, is_nominee_can_vote: e.target.checked })} />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-navy-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300"></div>
            </label>
          </div>

          {/* Toggle Abstain in Edit */}
          {(activePeriode?.mode_penilaian === 'MODE_1B' || activePeriode?.mode_penilaian === 'MODE_1A') && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 mb-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Izinkan Suara Abstain / Kotak Kosong</label>
                <p className="text-xs text-slate-500">Jika aktif, penilai dapat memilih opsi abstain jika tersedia.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={editForm.is_allow_abstain} onChange={(e) => setEditForm({ ...editForm, is_allow_abstain: e.target.checked })} />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-navy-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300"></div>
              </label>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Petunjuk Penilaian (Opsional)</label>
            <textarea
              rows={3}
              value={editForm.petunjuk_penilaian}
              onChange={(e) => setEditForm({ ...editForm, petunjuk_penilaian: e.target.value })}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-ghost"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={mutasiEdit.isPending}
              className="btn-primary"
            >
              {mutasiEdit.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Hapus Periode"
        message={`Apakah Anda yakin ingin menghapus periode "${deleteTarget?.nama_periode}"? Semua token, partisipan, dan data penilaian di dalamnya akan hilang permanen.`}
      />
    </main>
  );
}

export default function KelolaPeriode() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <ManajemenPeriodeContent adminProfile={adminProfile} />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Users, FileText, Settings, RefreshCw, BarChart2, Loader2, MapPin, UserCheck, Edit2, Trash2, X, Plus, Calendar, Award } from 'lucide-react';
import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';
import Modal from '../../components/common/Modal';
import { fetchPeriodeList, updateStatusPeriode, updatePeriodePenilaian, hapusPeriodePenilaian } from '../../services/adminService';

function DashboardContent({ adminProfile }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (adminProfile?.is_kakan) {
      navigate('/admin/dashboard-kakan', { replace: true });
    }
  }, [adminProfile, navigate]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    nama_periode: '',
    tgl_mulai: '',
    tgl_selesai: '',
    petunjuk_penilaian: '',
    status: 'DRAFT',
  });

  const filterWilayahId = adminProfile?.role_admin === 'ADMIN_KABKOTA' ? adminProfile.wilayah_id : null;

  const { data: daftarPeriode = [], isLoading, error } = useQuery({
    queryKey: ['daftar-periode', filterWilayahId],
    queryFn: () => fetchPeriodeList(filterWilayahId),
  });

  const mutasiStatus = useMutation({
    mutationFn: ({ id, status }) => updateStatusPeriode(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daftar-periode'] }),
    onError: (err) => alert(`Gagal mengubah status: ${err.message}`),
  });

  const mutasiEdit = useMutation({
    mutationFn: (payload) => updatePeriodePenilaian(editForm.id, payload),
    onSuccess: () => {
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['daftar-periode'] });
    },
    onError: (err) => alert(`Gagal mengedit periode: ${err.message}`),
  });

  const mutasiHapus = useMutation({
    mutationFn: (id) => hapusPeriodePenilaian(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['daftar-periode'] }),
    onError: (err) => alert(`Gagal menghapus periode: ${err.message}`),
  });

  function bukaModalEdit(p) {
    setEditForm({
      id: p.id,
      nama_periode: p.nama_periode || '',
      tgl_mulai: p.tgl_mulai ? p.tgl_mulai.substring(0, 10) : '',
      tgl_selesai: p.tgl_selesai ? p.tgl_selesai.substring(0, 10) : '',
      petunjuk_penilaian: p.petunjuk_penilaian || '',
      status: p.status || 'DRAFT',
    });
    setShowEditModal(true);
  }

  function handleSaveEdit(e) {
    e.preventDefault();
    const { id, ...payload } = editForm;
    mutasiEdit.mutate(payload);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
        Gagal memuat data: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Kelola Periode</h2>
          <p className="text-sm text-slate-500 mt-1">Daftar periode penilaian dalam sistem</p>
        </div>
        <Link
          to="/admin/kelola-periode"
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          Buat Baru
        </Link>
      </div>

      {/* Empty State */}
      {daftarPeriode.length === 0 ? (
        <div className="rounded-[2rem] border border-white/50 bg-white/70 backdrop-blur-xl p-12 text-center shadow-soft-xl">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-navy-50 to-slate-100 shadow-inner-soft">
            <Award className="h-10 w-10 text-navy-300" />
          </div>
          <p className="text-slate-500 mb-6 font-medium text-lg">Belum ada periode penilaian yang aktif.</p>
          <Link to="/admin/kelola-periode" className="btn-primary shadow-lg hover:-translate-y-0.5 inline-flex">
            <Plus className="h-5 w-5 mr-2" />
            Buat Periode Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {daftarPeriode.map((periode, idx) => (
            <div
              key={periode.id}
              className="group relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/80 backdrop-blur-xl shadow-soft-lg transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-400/20 transition-colors" />

              {/* Card Header */}
              <div className="relative border-b border-slate-100/50 p-5 bg-gradient-to-br from-navy-50/30 to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-bold text-navy-900 truncate">
                      {periode.nama_periode}
                    </h3>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <BadgeStatus status={periode.status} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => bukaModalEdit(periode)}
                      className="rounded-xl p-2 text-slate-400 hover:bg-navy-100 hover:text-navy-700 hover:shadow-sm transition-all"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus "${periode.nama_periode}"?`)) {
                          mutasiHapus.mutate(periode.id);
                        }
                      }}
                      className="rounded-xl p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 hover:shadow-sm transition-all"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 relative z-10">
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-white shadow-sm">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="truncate">{periode.wilayah?.nama_wilayah || 'Semua Wilayah'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-white shadow-sm">
                    <BarChart2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <span>{periode.mode_penilaian}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 font-medium bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                  <div className="p-1.5 rounded-lg bg-white shadow-sm">
                    <Calendar className="h-4 w-4 text-amber-600" />
                  </div>
                  <span>{formatTgl(periode.tgl_mulai)} - {formatTgl(periode.tgl_selesai)}</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-slate-100/80 p-4 bg-slate-50/30 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  {/* Status Actions */}
                  <div>
                    {mutasiStatus.isPending && mutasiStatus.variables?.id === periode.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-navy-400" />
                    ) : periode.status === 'DRAFT' ? (
                      <button
                        onClick={() => mutasiStatus.mutate({ id: periode.id, status: 'BERJALAN' })}
                        className="rounded-xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-500 hover:text-white shadow-sm"
                      >
                        Aktifkan
                      </button>
                    ) : periode.status === 'BERJALAN' ? (
                      <button
                        onClick={() => mutasiStatus.mutate({ id: periode.id, status: 'SELESAI' })}
                        className="rounded-xl bg-blue-100 px-4 py-2 text-xs font-bold text-blue-700 transition-all hover:bg-blue-500 hover:text-white shadow-sm"
                      >
                        Tutup Sesi
                      </button>
                    ) : periode.status === 'SELESAI' ? (
                      <button
                        onClick={() => mutasiStatus.mutate({ id: periode.id, status: 'DIARSIPKAN' })}
                        className="rounded-xl bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition-all hover:bg-red-500 hover:text-white shadow-sm"
                      >
                        Arsipkan
                      </button>
                    ) : null}
                  </div>

                  {/* View Results */}
                  <button
                    type="button"
                    onClick={() => navigate('/admin/dashboard-kakan')}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-navy-700 transition-all hover:bg-navy-700 hover:text-white shadow-sm border border-slate-200 hover:border-transparent group/btn"
                  >
                    <BarChart2 className="h-4 w-4 group-hover/btn:animate-pulse" />
                    Lihat Hasil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Periode"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Periode</label>
            <input
              type="text"
              required
              value={editForm.nama_periode}
              onChange={(e) => setEditForm({ ...editForm, nama_periode: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Mulai</label>
              <input
                type="date"
                required
                value={editForm.tgl_mulai}
                onChange={(e) => setEditForm({ ...editForm, tgl_mulai: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Selesai</label>
              <input
                type="date"
                required
                value={editForm.tgl_selesai}
                onChange={(e) => setEditForm({ ...editForm, tgl_selesai: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Petunjuk (Opsional)</label>
            <textarea
              rows={3}
              value={editForm.petunjuk_penilaian}
              onChange={(e) => setEditForm({ ...editForm, petunjuk_penilaian: e.target.value })}
              className="input resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-secondary"
            >
              Batal
            </button>
            <button type="submit" disabled={mutasiEdit.isPending} className="btn-primary">
              {mutasiEdit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function BadgeStatus({ status }) {
  const styles = {
    DRAFT: 'bg-slate-100 text-slate-700',
    BERJALAN: 'bg-emerald-100 text-emerald-800',
    SELESAI: 'bg-blue-100 text-blue-800',
    DIARSIPKAN: 'bg-red-100 text-red-800',
  };
  const css = styles[status] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${css}`}>
      {status}
    </span>
  );
}

function formatTgl(tglStr) {
  if (!tglStr) return '-';
  const d = new Date(tglStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}



export default function AdminDashboard() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <DashboardContent adminProfile={adminProfile} />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

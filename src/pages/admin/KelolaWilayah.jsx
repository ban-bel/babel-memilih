/**
 * @fileoverview Halaman manajemen wilayah/unit kerja.
 *
 * Admin dapat:
 * - Melihat daftar wilayah
 * - Menambah wilayah baru (via modal di mobile)
 * - Edit wilayah
 * - Hapus wilayah
 *
 * CATATAN:
 * - ADMIN_KABKOTA tidak bisa mengedit wilayah
 * - Di mobile, form tambah menggunakan modal
 *
 * @module pages/admin/KelolaWilayah
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Edit2, Trash2, Loader2, X, Check, ShieldAlert, Building } from 'lucide-react';

import { fetchWilayahList, tambahWilayah, updateWilayah, hapusWilayah } from '../../services/adminService';
import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';

/**
 * Komponen form wilayah (untuk modal).
 */
function FormWilayah({ editData, onSubmit, onCancel, isPending }) {
  const [kodeWilayah, setKodeWilayah] = useState(editData?.kode_wilayah || '');
  const [namaWilayah, setNamaWilayah] = useState(editData?.nama_wilayah || '');
  const [namaUnitKerja, setNamaUnitKerja] = useState(editData?.nama_unit_kerja || '');
  const [level, setLevel] = useState(editData?.level || 'PROVINSI');
  const [parentId, setParentId] = useState(editData?.parent_id ? String(editData.parent_id) : '');

  const { data: wilayahProvinsi = [] } = useQuery({
    queryKey: ['wilayah-list'],
    queryFn: fetchWilayahList,
  });

  const isEditing = Boolean(editData);

  function handleSubmit(e) {
    e.preventDefault();
    if (!namaWilayah.trim()) return;

    const payload = {
      kode_wilayah: kodeWilayah || null,
      nama_wilayah: namaWilayah,
      nama_unit_kerja: namaUnitKerja || null,
      level,
      parent_id: parentId ? Number(parentId) : null,
    };

    if (isEditing) {
      onSubmit(payload);
    } else {
      onSubmit(kodeWilayah, namaWilayah, level, parentId ? Number(parentId) : null, namaUnitKerja);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kode Wilayah</label>
        <input
          type="text"
          maxLength="4"
          value={kodeWilayah}
          onChange={(e) => setKodeWilayah(e.target.value)}
          placeholder="3200"
          className="input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Wilayah</label>
        <input
          type="text"
          required
          value={namaWilayah}
          onChange={(e) => setNamaWilayah(e.target.value)}
          placeholder="Jawa Barat"
          className="input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Kerja</label>
        <input
          type="text"
          value={namaUnitKerja}
          onChange={(e) => setNamaUnitKerja(e.target.value)}
          placeholder="Kanwil Kemenag..."
          className="input"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Level</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="input"
        >
          <option value="PROVINSI">PROVINSI</option>
          <option value="KABKOTA">KABUPATEN/KOTA</option>
        </select>
      </div>
      {level === 'KABKOTA' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Provinsi Induk</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="input"
          >
            <option value="">Pilih...</option>
            {wilayahProvinsi.filter(w => w.level === 'PROVINSI').map((w) => (
              <option key={w.id} value={w.id}>{w.nama_wilayah}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Batal
        </button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEditing ? 'Simpan' : 'Tambah'}
        </button>
      </div>
    </form>
  );
}

/**
 * Modal untuk form wilayah.
 */
function ModalWilayah({ isOpen, onClose, editData, onSubmit, isPending }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-navy-900">
            {editData ? 'Edit Wilayah' : 'Tambah Wilayah'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <FormWilayah
            editData={editData}
            onSubmit={onSubmit}
            onCancel={onClose}
            isPending={isPending}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Content utama halaman kelola wilayah.
 */
function KelolaWilayahContent({ adminProfile }) {
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  // Akses ditolak untuk ADMIN_KABKOTA
  if (adminProfile?.role_admin === 'ADMIN_KABKOTA') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
          <ShieldAlert className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-red-900">Akses Terbatas</h2>
        <p className="mt-2 text-sm text-red-700 max-w-md mx-auto">
          Sebagai Admin Kabupaten/Kota, Anda tidak memiliki akses untuk mengedit data Wilayah.
        </p>
      </div>
    );
  }

  // Fetch daftar wilayah
  const { data: wilayahList = [], isLoading } = useQuery({
    queryKey: ['wilayah-list'],
    queryFn: fetchWilayahList,
  });

  // Mutation: Tambah/Edit wilayah
  const mutasiSimpan = useMutation({
    mutationFn: (payload) => {
      if (editId) {
        return updateWilayah(editId, payload);
      } else {
        // payload adalah parameter terpisah untuk tambahWilayah
        const [kode, nama, lv, parent, unit] = arguments;
        return tambahWilayah(kode, nama, lv, parent, unit);
      }
    },
    onSuccess: () => {
      setShowModal(false);
      setEditId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['wilayah-list'] });
    },
    onError: (err) => setError(err.message),
  });

  // Mutation: Hapus wilayah
  const mutasiHapus = useMutation({
    mutationFn: (id) => hapusWilayah(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wilayah-list'] }),
    onError: (err) => setError(err.message),
  });

  function bukaEdit(w) {
    setEditId(w.id);
    setShowModal(true);
    setError(null);
  }

  function bukaTambah() {
    setEditId(null);
    setShowModal(true);
    setError(null);
  }

  function handleEditSubmit(payload) {
    mutasiSimpan.mutate(payload);
  }

  function handleTambahSubmit(kode, nama, lv, parent, unit) {
    mutasiSimpan.mutate(kode, nama, lv, parent, unit);
  }

  function tutupModal() {
    setShowModal(false);
    setEditId(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-navy-700 to-navy-800 text-white shadow-lg">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-navy-900">Kelola Wilayah</h2>
            <p className="text-sm text-slate-500">{wilayahList.length} wilayah/unit kerja</p>
          </div>
        </div>

        {/* Tombol Tambah - Desktop */}
        <button
          onClick={bukaTambah}
          className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-600 transition-colors shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Tambah Wilayah
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Tombol Tambah - Mobile (FAB) */}
      <button
        onClick={bukaTambah}
        className="sm:hidden fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-navy-700 text-white shadow-xl hover:bg-navy-600 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        <div className="table-header px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-navy-900">Daftar Wilayah</span>
          <span className="text-xs text-slate-500">{wilayahList.length} data</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : wilayahList.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Belum ada wilayah</div>
          ) : (
            wilayahList.map((w) => {
              const parent = wilayahList.find((p) => p.id === w.parent_id);
              const isBeingEdited = editId === w.id;
              return (
                <div
                  key={w.id}
                  className={`flex items-center justify-between px-4 py-3 ${isBeingEdited ? 'bg-amber-50/60' : 'hover:bg-slate-50'} transition-colors`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {w.kode_wilayah && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">
                          {w.kode_wilayah}
                        </span>
                      )}
                      <p className="font-semibold text-slate-800 truncate">{w.nama_wilayah}</p>
                    </div>
                    {w.nama_unit_kerja && (
                      <p className="text-xs text-navy-700 font-medium">{w.nama_unit_kerja}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{w.level}</span>
                      {parent && <span className="text-slate-400"> · Induk: {parent.nama_wilayah}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => bukaEdit(w)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus "${w.nama_wilayah}"?`)) {
                          mutasiHapus.mutate(w.id);
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      <ModalWilayah
        isOpen={showModal}
        onClose={tutupModal}
        editData={editId ? wilayahList.find(w => w.id === editId) : null}
        onSubmit={editId ? handleEditSubmit : handleTambahSubmit}
        isPending={mutasiSimpan.isPending}
      />
    </div>
  );
}

export default function KelolaWilayah() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <KelolaWilayahContent adminProfile={adminProfile} />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

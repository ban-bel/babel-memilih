/**
 * @fileoverview Halaman Kelola Template Pesan WhatsApp
 *
 * CRUD untuk template pesan WA:
 * - Lihat semua template
 * - Tambah template baru
 * - Edit template
 * - Hapus template
 * - Toggle aktif/nonaktif
 *
 * @module pages/admin/KelolaTemplateWA
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchSemuaTemplateWa,
  tambahTemplateWa,
  updateTemplateWa,
  hapusTemplateWa,
  toggleTemplateWaActive
} from '../../services/templateWaService';
import ConfirmModal from '../../components/common/ConfirmModal';
import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';

// Placeholder info - WAJIB mengandung [LINK]
const PLACEHOLDERS = [
  { code: '[NAMA]', label: 'Nama lengkap recipient', example: 'Budi Santoso' },
  { code: '[PANGGILAN]', label: 'Sapaan (Bapak/Ibu/Bang/Kak)', example: 'Bapak' },
  { code: '[LINK]', label: 'URL token akses', example: 'https://...', required: true },
  { code: '[PERAN]', label: 'Role (Nominee/Penilai/Juri)', example: 'Nominee' },
  { code: '[NAMA_PERIODE]', label: 'Nama periode penilaian', example: 'Awards Bulanan Juli 2026' },
  { code: '[TANGGAL_MULAI]', label: 'Tanggal mulai periode', example: '30 Juli 2026' },
  { code: '[TANGGAL_SELESAI]', label: 'Tanggal selesai periode', example: '5 Agustus 2026' },
];

/**
 * Modal untuk Tambah/Edit Template
 */
function TemplateModal({ isOpen, onClose, onSave, template = null, isLoading }) {
  const [nama, setNama] = useState('');
  const [konteks, setKonteks] = useState('');
  const [pesan, setPesan] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (template) {
      let namaParsed = template.nama_tampilan;
      let k = '';
      if (namaParsed.startsWith('[PENILAI] ')) { k = '[PENILAI] '; namaParsed = namaParsed.replace('[PENILAI] ', ''); }
      else if (namaParsed.startsWith('[NOMINEE] ')) { k = '[NOMINEE] '; namaParsed = namaParsed.replace('[NOMINEE] ', ''); }
      else if (namaParsed.startsWith('[JURI] ')) { k = '[JURI] '; namaParsed = namaParsed.replace('[JURI] ', ''); }

      setNama(namaParsed);
      setKonteks(k);
      setPesan(template.isi_pesan);
    } else {
      setNama('');
      setKonteks('');
      setPesan('');
    }
    setErrors({});
  }, [template, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!nama.trim()) errs.nama = 'Nama template wajib diisi';
    if (!pesan.trim()) errs.pesan = 'Isi pesan wajib diisi';
    if (!pesan.includes('[LINK]')) errs.pesan = 'Pesan harus mengandung placeholder [LINK]';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ nama_tampilan: konteks + nama.trim(), isi_pesan: pesan.trim() });
  };

  const insertPlaceholder = (placeholder) => {
    setPesan((prev) => prev + placeholder);
    setErrors((prev) => ({ ...prev, pesan: undefined }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-soft-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">
            {template ? 'Edit Template' : 'Tambah Template'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Konteks Template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Peruntukan (Konteks)
            </label>
            <select
              value={konteks}
              onChange={(e) => setKonteks(e.target.value)}
              className="input bg-white"
            >
              <option value="">Umum (Semua Peran)</option>
              <option value="[PENILAI] ">Khusus Penilai</option>
              <option value="[NOMINEE] ">Khusus Nominee</option>
              <option value="[JURI] ">Khusus Juri</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Jika dipilih "Khusus", template ini hanya akan muncul saat admin menekan tombol WA di tab tersebut.
            </p>
          </div>

          {/* Nama Template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Template
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                setErrors((prev) => ({ ...prev, nama: undefined }));
              }}
              placeholder="Contoh: Santai, Hangat, Formal"
              className={`input ${errors.nama ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {errors.nama && <p className="mt-1 text-xs text-red-500">{errors.nama}</p>}
          </div>

          {/* Isi Pesan */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Isi Pesan
            </label>
            <textarea
              value={pesan}
              onChange={(e) => {
                setPesan(e.target.value);
                setErrors((prev) => ({ ...prev, pesan: undefined }));
              }}
              rows={5}
              placeholder="Ketik pesan di sini..."
              className={`input resize-none ${errors.pesan ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {errors.pesan && <p className="mt-1 text-xs text-red-500">{errors.pesan}</p>}

            {/* Placeholder Buttons */}
            <div className="mt-2 space-y-2">
              <p className="text-xs text-slate-500">Klik untuk menyisipkan placeholder:</p>
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map((ph) => (
                  <button
                    key={ph.code}
                    type="button"
                    onClick={() => insertPlaceholder(ph.code)}
                    title={ph.label}
                    className={`rounded-lg px-2 py-1 text-xs font-mono hover:bg-slate-200 ${
                      ph.required
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ph.code}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-600">
                ⚠️ Template WA <strong>wajib mengandung [LINK]</strong>
              </p>
            </div>
          </div>

          {/* Preview */}
          {pesan && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Preview:</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{pesan}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-xl bg-navy-700 py-2.5 text-sm font-semibold text-white hover:bg-navy-600 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : template ? (
                'Simpan'
              ) : (
                'Tambah'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Main Component
 */
function KelolaTemplateWAContent() {
  const queryClient = useQueryClient();

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch templates
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['template-wa'],
    queryFn: fetchSemuaTemplateWa
  });

  // Mutations
  const createMut = useMutation({
    mutationFn: tambahTemplateWa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-wa'] });
      setIsModalOpen(false);
      toast.success('Template berhasil ditambahkan');
    },
    onError: (err) => toast.error(err.message)
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => updateTemplateWa(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-wa'] });
      setIsModalOpen(false);
      setEditingTemplate(null);
      toast.success('Template berhasil diupdate');
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMut = useMutation({
    mutationFn: hapusTemplateWa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-wa'] });
      setDeleteTarget(null);
      toast.success('Template berhasil dihapus');
    },
    onError: (err) => toast.error(err.message)
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }) => toggleTemplateWaActive(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-wa'] });
      toast.success('Status template diupdate');
    },
    onError: (err) => toast.error(err.message)
  });

  // Filter templates
  const filteredTemplates = templates.filter(t =>
    t.nama_tampilan.toLowerCase().includes(search.toLowerCase()) ||
    t.isi_pesan.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (payload) => {
    if (editingTemplate) {
      updateMut.mutate({ id: editingTemplate.id, payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (template) => {
    setDeleteTarget(template);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMut.mutate(deleteTarget.id);
    }
  };

  const activeCount = templates.filter(t => t.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Template Pesan WA</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeCount} template aktif dari {templates.length} total
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-600"
        >
          <Plus className="h-4 w-4" />
          Tambah Template
        </button>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MessageSquare className="h-4 w-4" />
          Placeholder yang Tersedia
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PLACEHOLDERS.map((ph) => (
            <div key={ph.code} className="flex items-start gap-2 rounded-lg bg-white p-2">
              <code className={`rounded px-1.5 py-0.5 text-xs font-mono ${ph.required ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                {ph.code}
              </code>
              <span className="text-xs text-slate-500">{ph.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-amber-600">
          ⚠️ <strong>WAJIB:</strong> Template harus mengandung placeholder <code className="bg-amber-100 px-1 rounded">[LINK]</code>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          💡 Tip: Gunakan placeholder berbeda untuk tiap kategori (Nominee, Penilai, Juri) agar pesan tidak identik.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari template..."
        className="input max-w-md"
      />

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
          {error.message}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">Belum ada template</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Isi Pesan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTemplates.map((template) => (
                <tr key={template.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">
                      {template.nama_tampilan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="max-w-xs truncate text-slate-600" title={template.isi_pesan}>
                      {template.isi_pesan}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMut.mutate({ id: template.id, is_active: !template.is_active })}
                      disabled={toggleMut.isPending}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                        template.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {template.is_active ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          Nonaktif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <TemplateModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        onSave={handleSave}
        template={editingTemplate}
        isLoading={createMut.isPending || updateMut.isPending}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Hapus Template?"
        message={`Yakin ingin menghapus template "${deleteTarget?.nama_tampilan}"?`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

/**
 * Wrapper dengan Auth Gate dan Layout
 */
export default function KelolaTemplateWA() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <KelolaTemplateWAContent />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

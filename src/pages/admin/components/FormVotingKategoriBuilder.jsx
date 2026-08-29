/**
 * @fileoverview Form builder untuk kategori voting MODE_1B (Hybrid).
 *
 * Admin dapat menambah, mengedit, dan menghapus kategori voting.
 * Kategori voting aktif ketika MODE_1B memiliki setidaknya 1 kategori.
 *
 * @module pages/admin/components/FormVotingKategoriBuilder
 */

import { Plus, Trash2, GripVertical } from 'lucide-react';

/**
 * Buat objek baris kategori voting baru.
 *
 * @function buatBarisKategoriVoting
 * @returns {Object} Objek baris dengan default values
 */
export function buatBarisKategoriVoting() {
  return {
    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    nama_kategori: '',
    deskripsi: '',
  };
}

/**
 * Komponen FormVotingKategoriBuilder.
 *
 * Menampilkan form untuk menambah/mengedit/menghapus kategori voting.
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {Object[]} props.daftar - Array kategori voting
 * @param {Function} props.onChange - Callback saat daftar berubah
 *
 * @example
 * <FormVotingKategoriBuilder
 *   daftar={form.votingKategori}
 *   onChange={(d) => ubah('votingKategori', d)}
 * />
 */
export default function FormVotingKategoriBuilder({ daftar, onChange }) {
  function handleUbah(index, field, nilai) {
    const baru = [...daftar];
    baru[index] = { ...baru[index], [field]: nilai };
    onChange(baru);
  }

  function handleTambah() {
    onChange([...daftar, buatBarisKategoriVoting()]);
  }

  function handleHapus(index) {
    if (daftar.length <= 1) return; // Minimal 1 kategori
    onChange(daftar.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Kategori Voting</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Voting kategori — voter wajib vote di SEMUA kategori
          </p>
        </div>
        <button
          type="button"
          onClick={handleTambah}
          className="flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium"
        >
          <Plus className="h-4 w-4" />
          Tambah Kategori
        </button>
      </div>

      <div className="space-y-3">
        {daftar.map((kategori, index) => (
          <div
            key={kategori.id}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all"
          >
            <div className="flex items-start gap-3">
              {/* Drag Handle (visual only) */}
              <div className="mt-1 text-slate-300">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nama Kategori *
                  </label>
                  <input
                    type="text"
                    value={kategori.nama_kategori}
                    onChange={(e) => handleUbah(index, 'nama_kategori', e.target.value)}
                    placeholder="mis. Pegawai Terlucu"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Deskripsi (opsional)
                  </label>
                  <textarea
                    value={kategori.deskripsi}
                    onChange={(e) => handleUbah(index, 'deskripsi', e.target.value)}
                    placeholder="mis. Paling menghibur dan humoris (mendukung Markdown)"
                    className="w-full min-h-[60px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100 resize-y"
                    rows={2}
                  />
                </div>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleHapus(index)}
                disabled={daftar.length <= 1}
                className={`mt-1 rounded-lg p-2 transition-colors ${
                  daftar.length <= 1
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                }`}
                title={daftar.length <= 1 ? 'Minimal 1 kategori' : 'Hapus kategori'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Urutan indicator */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                {index + 1}
              </span>
              <span>Voter akan melihat kategori ini di urutan ke-{index + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      {daftar.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            <strong>Info:</strong> Total {daftar.length} kategori voting. Voter harus memilih 1 nominee di setiap kategori sebelum bisa submit.
          </p>
        </div>
      )}
    </div>
  );
}

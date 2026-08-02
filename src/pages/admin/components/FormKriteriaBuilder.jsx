import { Plus, Trash2, Target, Info } from 'lucide-react';

let idBaru = 0;
function buatBaris() {
  idBaru += 1;
  return {
    key: `baru-${idBaru}`,
    nama_kriteria: '',
    deskripsi: '',
    skor_min: 1,
    skor_max: 100,
  };
}

/**
 * Builder komponen untuk kriteria Mode 2A.
 * MODE_2A: Pilih 1 nominee + beri skor per kriteria (tanpa bobot).
 *
 * @param {Object} props
 * @param {Array} props.daftar - Array kriteria [{key, nama_kriteria, deskripsi, skor_min, skor_max}]
 * @param {Function} props.onChange - Callback untuk update daftar
 */
export default function FormKriteriaBuilder({ daftar, onChange }) {
  function tambah() {
    onChange([...daftar, buatBaris()]);
  }

  function hapus(key) {
    onChange(daftar.filter((k) => k.key !== key));
  }

  function ubah(key, field, nilai) {
    onChange(daftar.map((k) => (k.key === key ? { ...k, [field]: nilai } : k)));
  }

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Kriteria Penilaian</p>
          <p className="mt-1 text-blue-700/80">
            Tentukan kriteria yang akan digunakan untuk menilai nominee.
            Setiap penilai akan memberikan skor pada kriteria-kriteria ini.
          </p>
        </div>
      </div>

      {/* Kriteria list */}
      <div className="space-y-3">
        {daftar.map((k, idx) => (
          <div
            key={k.key}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-soft"
          >
            <div className="flex items-start gap-3">
              {/* Number badge */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-xs font-bold text-navy-700">
                {idx + 1}
              </div>

              <div className="flex-1 space-y-3">
                {/* Nama kriteria */}
                <input
                  type="text"
                  value={k.nama_kriteria}
                  onChange={(e) => ubah(k.key, 'nama_kriteria', e.target.value)}
                  placeholder="Nama kriteria (contoh: Inovasi, Kepemimpinan, Dampak)"
                  className="input text-sm"
                />

                {/* Deskripsi */}
                <input
                  type="text"
                  value={k.deskripsi}
                  onChange={(e) => ubah(k.key, 'deskripsi', e.target.value)}
                  placeholder="Deskripsi singkat (opsional)"
                  className="input text-sm"
                />

                {/* Range skor */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <span className="text-xs">Skor Min:</span>
                    <input
                      type="number"
                      value={k.skor_min}
                      onChange={(e) => ubah(k.key, 'skor_min', Number(e.target.value))}
                      className="input w-16 text-center"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-slate-600">
                    <span className="text-xs">Skor Max:</span>
                    <input
                      type="number"
                      value={k.skor_max}
                      onChange={(e) => ubah(k.key, 'skor_max', Number(e.target.value))}
                      className="input w-16 text-center"
                    />
                  </label>
                  <span className="text-xs text-slate-400">
                    Range: {k.skor_min} - {k.skor_max}
                  </span>
                </div>
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => hapus(k.key)}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Hapus kriteria"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={tambah}
        className="w-full rounded-xl border-2 border-dashed border-navy-300 bg-navy-50/50 p-4 text-sm font-medium text-navy-700 transition-all hover:bg-navy-100 hover:border-navy-400"
      >
        <Plus className="mr-2 inline h-4 w-4" />
        Tambah Kriteria
      </button>

      {/* Empty state */}
      {daftar.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Target className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-600">
            Belum ada kriteria. Klik tombol di atas untuk menambahkan.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Minimal 1 kriteria diperlukan untuk Mode 2A.
          </p>
        </div>
      )}
    </div>
  );
}

export { buatBaris as buatBarisKriteria };

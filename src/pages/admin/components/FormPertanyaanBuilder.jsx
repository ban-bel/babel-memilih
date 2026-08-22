import { Plus, Trash2 } from 'lucide-react';

let idBaru = 0;
function buatBaris() {
  idBaru += 1;
  return { key: `baru-${idBaru}`, teks_pertanyaan: '', skor_min: 1, skor_max: 100, is_dinilai: false };
}

/**
 * Form Pertanyaan untuk Mode 1A — daftar dinamis (tambah/hapus baris).
 */
export default function FormPertanyaanBuilder({ 
  daftar, 
  onChange,
  labels = {
    title: 'Daftar Isian / Pertanyaan',
    item: 'Isian',
    placeholder: 'Tulis instruksi isian atau pertanyaan...',
    addBtn: 'Tambah Isian / Pertanyaan',
    hideScores: false,
    showDinilaiToggle: false
  }
}) {
  function tambah() {
    onChange([...daftar, buatBaris()]);
  }
  function hapus(key) {
    onChange(daftar.filter((p) => p.key !== key));
  }
  function ubah(key, field, nilai) {
    onChange(daftar.map((p) => (p.key === key ? { ...p, [field]: nilai } : p)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{labels.title}</p>
        <span className="badge badge-primary">{daftar.length} {labels.item}</span>
      </div>

      <div className="space-y-3">
        {daftar.map((p, idx) => (
          <div key={p.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-soft">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-xs font-bold text-navy-800">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <textarea
                  rows={2}
                  value={p.teks_pertanyaan}
                  onChange={(e) => ubah(p.key, 'teks_pertanyaan', e.target.value)}
                  placeholder={labels.placeholder}
                  className="input resize-none text-sm"
                />
                {!labels.hideScores && (
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 text-slate-600">
                      <span>Min:</span>
                      <input type="number" value={p.skor_min} onChange={(e) => ubah(p.key, 'skor_min', Number(e.target.value))} className="input w-20 text-center" />
                    </label>
                    <label className="flex items-center gap-2 text-slate-600">
                      <span>Max:</span>
                      <input type="number" value={p.skor_max} onChange={(e) => ubah(p.key, 'skor_max', Number(e.target.value))} className="input w-20 text-center" />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {labels.showDinilaiToggle && (
                  <select 
                    className="input input-sm w-44 text-xs bg-white cursor-pointer"
                    value={p.is_dinilai ? 'score' : 'info'}
                    onChange={(e) => ubah(p.key, 'is_dinilai', e.target.value === 'score')}
                  >
                    <option value="info">Hanya Kelengkapan</option>
                    <option value="score">Masuk Penilaian</option>
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => hapus(p.key)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={tambah} className="w-full rounded-xl border-2 border-dashed border-navy-300 bg-navy-50/50 p-4 text-sm font-medium text-navy-700 transition-all hover:bg-navy-100 hover:border-navy-400">
        <Plus className="h-4 w-4 inline mr-2" />
        {labels.addBtn}
      </button>
    </div>
  );
}

export { buatBaris as buatBarisPertanyaan };

import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

let idBaru = 0;
function buatBaris() {
  idBaru += 1;
  return { key: `baru-${idBaru}`, nama_kategori: '', deskripsi: '', bobot_persen: 0, skor_min: 1, skor_max: 100 };
}

export default function FormKategoriBuilder({ daftar, onChange }) {
  const totalBobot = daftar.reduce((sum, k) => sum + (Number(k.bobot_persen) || 0), 0);
  const bobotValid = totalBobot === 100;

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
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Kategori & Bobot</p>
        <span className={`badge ${bobotValid ? 'badge-success' : 'badge-warning'}`}>
          Total: {totalBobot}%
        </span>
      </div>

      <div className="space-y-3">
        {daftar.map((k, idx) => (
          <div key={k.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-soft">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-xs font-bold text-gold-700">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={k.nama_kategori}
                  onChange={(e) => ubah(k.key, 'nama_kategori', e.target.value)}
                  placeholder="Nama kategori"
                  className="input text-sm"
                />
                <input
                  type="text"
                  value={k.deskripsi}
                  onChange={(e) => ubah(k.key, 'deskripsi', e.target.value)}
                  placeholder="Deskripsi (opsional)"
                  className="input text-sm"
                />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <span>Bobot:</span>
                    <input type="number" value={k.bobot_persen} onChange={(e) => ubah(k.key, 'bobot_persen', Number(e.target.value))} className="input w-20 text-center" />
                    <span>%</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-600">
                    <span>Min:</span>
                    <input type="number" value={k.skor_min} onChange={(e) => ubah(k.key, 'skor_min', Number(e.target.value))} className="input w-16 text-center" />
                  </label>
                  <label className="flex items-center gap-2 text-slate-600">
                    <span>Max:</span>
                    <input type="number" value={k.skor_max} onChange={(e) => ubah(k.key, 'skor_max', Number(e.target.value))} className="input w-16 text-center" />
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => hapus(k.key)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                aria-label="Hapus"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={tambah} className="w-full rounded-xl border-2 border-dashed border-navy-300 bg-navy-50/50 p-4 text-sm font-medium text-navy-700 transition-all hover:bg-navy-100 hover:border-navy-400">
        <Plus className="h-4 w-4 inline mr-2" />
        Tambah Kategori
      </button>

      <div className={`flex items-center gap-2 rounded-xl p-3 ${bobotValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {bobotValid ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
        <span className="text-sm">
          Total bobot: <strong>{totalBobot}%</strong> {bobotValid ? '✓ Sudah tepat 100%' : '— Harus tepat 100%'}
        </span>
      </div>
    </div>
  );
}

export { buatBaris as buatBarisKategori };

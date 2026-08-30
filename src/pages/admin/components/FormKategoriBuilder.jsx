import { useEffect, useRef } from 'react';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';

function AutoResizeTextarea({ value, onChange, placeholder, className }) {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${className} resize-none overflow-y-auto`}
      style={{ minHeight: '60px', maxHeight: '160px' }}
      rows={2}
    />
  );
}

let idBaru = 0;
function buatBaris(opsi = {}) {
  idBaru += 1;
  return { 
    key: `baru-${idBaru}`, 
    nama_kategori: opsi.nama_kategori || '', 
    deskripsi: opsi.deskripsi || '', 
    bobot_persen: 0, 
    skor_min: 1, 
    skor_max: 100,
    is_system: opsi.is_system || false 
  };
}

export default function FormKategoriBuilder({ daftar, onChange, formState }) {
  const totalBobot = daftar.reduce((sum, k) => sum + (Number(k.bobot_persen) || 0), 0);
  const totalBobotRounded = Number(totalBobot.toFixed(2));
  const bobotValid = totalBobotRounded === 100;

  // Auto-sync system categories
  useEffect(() => {
    if (!formState) return;
    
    const requiredSystem = [];
    if (formState.is_video_profil_dinilai) requiredSystem.push('Video Profil');
    if (formState.is_portofolio_pengembangan_dinilai) requiredSystem.push('Portofolio Pengembangan Diri');
    if (formState.is_portofolio_inovasi_dinilai) requiredSystem.push('Portofolio Inovasi');
    if (formState.is_portofolio_penghargaan_dinilai) requiredSystem.push('Portofolio Penghargaan');

    // Dinamis dari form pertanyaan (misal: Makalah)
    if (Array.isArray(formState.pertanyaan)) {
      formState.pertanyaan.forEach(p => {
        if (p.is_dinilai && p.teks_pertanyaan.trim()) {
          requiredSystem.push(`Dokumen: ${p.teks_pertanyaan.trim()}`);
        }
      });
    }

    let changed = false;
    let newDaftar = [...daftar];

    // Remove system categories that are no longer active
    newDaftar = newDaftar.filter(k => {
      if (k.is_system && !requiredSystem.includes(k.nama_kategori)) {
        changed = true;
        return false;
      }
      return true;
    });

    // Add required system categories that don't exist yet
    requiredSystem.forEach(req => {
      if (!newDaftar.find(k => k.nama_kategori === req)) {
        newDaftar.push(buatBaris({ nama_kategori: req, is_system: true, deskripsi: `Otomatis ditambahkan dari form kelengkapan` }));
        changed = true;
      }
    });

    // Sort so system categories are always at the top
    const sorted = [...newDaftar].sort((a, b) => {
      if (a.is_system && !b.is_system) return -1;
      if (!a.is_system && b.is_system) return 1;
      return 0;
    });

    // Check if sorting actually changed the order
    const isOrderChanged = JSON.stringify(sorted.map(k => k.key)) !== JSON.stringify(newDaftar.map(k => k.key));
    if (isOrderChanged) {
      changed = true;
      newDaftar = sorted;
    }

    if (changed) {
      onChange(newDaftar);
    }
  }, [formState, daftar, onChange]);

  function tambah() {
    onChange([...daftar, buatBaris()]);
  }
  
  function hapus(key) {
    onChange(daftar.filter((k) => k.key !== key));
  }
  
  function ubah(key, field, nilai) {
    onChange(daftar.map((k) => (k.key === key ? { ...k, [field]: nilai } : k)));
  }

  function bagiRataOtomatis() {
    if (daftar.length === 0) return;
    const rata = Number((100 / daftar.length).toFixed(2));
    // handle pembulatan agar total selalu 100
    const newDaftar = daftar.map((k, idx) => {
      let bobot = rata;
      if (idx === daftar.length - 1) {
        bobot = Number((100 - (rata * (daftar.length - 1))).toFixed(2));
      }
      return { ...k, bobot_persen: bobot };
    });
    onChange(newDaftar);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Daftar Kategori Penilaian</p>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={bagiRataOtomatis}
            disabled={daftar.length === 0}
            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <Calculator className="w-3.5 h-3.5" /> Bagi Rata Otomatis
          </button>
          <span className={`badge ${bobotValid ? 'badge-success' : 'badge-warning'}`}>
            Total: {totalBobot}%
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {daftar.map((k, idx) => (
          <div key={k.key} className={`rounded-xl border ${k.is_system ? 'border-navy-200 bg-navy-50/20' : 'border-slate-200 bg-white'} p-4 shadow-sm transition-all hover:shadow-soft`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${k.is_system ? 'bg-navy-100 text-navy-700' : 'bg-gold-100 text-gold-700'}`}>
                {idx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={k.nama_kategori}
                  onChange={(e) => ubah(k.key, 'nama_kategori', e.target.value)}
                  placeholder="Nama kategori"
                  className={`input text-sm ${k.is_system ? 'bg-slate-50 opacity-90' : ''}`}
                  readOnly={k.is_system}
                />
                <AutoResizeTextarea
                  value={k.deskripsi}
                  onChange={(e) => ubah(k.key, 'deskripsi', e.target.value)}
                  placeholder="Deskripsi (opsional, mendukung Markdown)"
                  className="input text-sm py-2"
                />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <span>Bobot:</span>
                    <input type="number" step="0.01" value={k.bobot_persen} onChange={(e) => ubah(k.key, 'bobot_persen', Number(e.target.value))} className="input w-24 text-center" />
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
              {!k.is_system && (
                <button
                  type="button"
                  onClick={() => hapus(k.key)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                  aria-label="Hapus"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={tambah} className="w-full rounded-xl border-2 border-dashed border-navy-300 bg-navy-50/50 p-4 text-sm font-medium text-navy-700 transition-all hover:bg-navy-100 hover:border-navy-400">
        <Plus className="h-4 w-4 inline mr-2" />
        Tambah Kategori Manual
      </button>

      <div className={`flex items-center gap-2 rounded-xl p-3 ${bobotValid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
        {bobotValid ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
        <p className="text-sm">
          Total bobot: <strong>{totalBobotRounded}%</strong> {bobotValid ? '✓ Sudah tepat 100%' : '— Harus tepat 100%'}
        </p>
      </div>
    </div>
  );
}

export { buatBaris as buatBarisKategori };

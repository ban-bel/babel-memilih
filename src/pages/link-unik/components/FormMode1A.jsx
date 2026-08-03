import { useState, useMemo, useEffect } from 'react';
import { Send, Loader2, ChevronDown, Star, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import ConfirmModal from '../../../components/common/ConfirmModal';

function kunciSkor(nomineeId, pertanyaanId) {
  return `${nomineeId}:${pertanyaanId}`;
}

function getEmbedUrl(url) {
  if (!url) return '';
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  if (videoIdMatch && videoIdMatch[1]) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return url;
}

/**
 * Form Mode 1A — Voting Evaluatif Pegawai. Satu kartu per nominee, berisi
 * slider skor untuk tiap pertanyaan. Daftar `nominee` yang diterima di sini
 * SUDAH melewati Anti Self-Vote Filter di votingService.fetchDaftarNominee —
 * komponen ini tidak perlu (dan tidak boleh) memfilter ulang.
 *
 * @param {{id:number,nama:string,unit_kerja:string,foto_url?:string,video_profil_link?:string}[]} nominee
 * @param {{id:number,urutan:number,teks_pertanyaan:string,skor_min:number,skor_max:number}[]} pertanyaan
 * @param {{nominee_id:number,pertanyaan_id:number,teks_jawaban?:string,file_url?:string}[]} jawaban
 * @param {(daftarSkor: {nominee_id:number,pertanyaan_id:number,skor:number}[], daftarNominee: object[]) => void} onSubmit
 * @param {boolean} isSubmitting
 * @param {string|null} [errorMessage] - Error message from submit
 */
export default function FormMode1A({ token, nominee, pertanyaan, jawaban, onSubmit, isSubmitting, errorMessage }) {
  const loadDraft = () => {
    if (!token) return null;
    try {
      const saved = localStorage.getItem(`draft_mode1a_${token}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to read draft", e);
    }
    return null;
  };

  const draft = useMemo(loadDraft, [token]);

  const nilaiAwal = useMemo(() => {
    if (draft && draft.skor) {
      const awal = {};
      nominee.forEach((n) => {
        pertanyaan.forEach((p) => {
          const key = kunciSkor(n.id, p.id);
          awal[key] = draft.skor[key] !== undefined ? draft.skor[key] : p.skor_min;
        });
      });
      return awal;
    }
    const awal = {};
    nominee.forEach((n) => {
      pertanyaan.forEach((p) => {
        awal[kunciSkor(n.id, p.id)] = p.skor_min;
      });
    });
    return awal;
  }, [nominee, pertanyaan, draft]);

  const [skor, setSkor] = useState(nilaiAwal);
  const [hasDraft, setHasDraft] = useState(!!draft);
  const [nomineeTerbuka, setNomineeTerbuka] = useState(() => nominee[0]?.id ?? null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [tersentuh, setTersentuh] = useState(() => {
    if (draft && draft.tersentuh) {
      return new Set(draft.tersentuh);
    }
    const s = new Set();
    if (nominee[0]) s.add(nominee[0].id);
    return s;
  });

  useEffect(() => {
    if (!token) return;
    if (hasDraft || tersentuh.size > 1) {
      localStorage.setItem(`draft_mode1a_${token}`, JSON.stringify({
        skor,
        tersentuh: Array.from(tersentuh)
      }));
    }
  }, [skor, tersentuh, hasDraft, token]);
  // Track which input is being edited and its temporary value
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const totalTerisi = nominee.length * pertanyaan.length;
  const sudahDinilai = nominee.filter(
    (n) => tersentuh.has(n.id) && pertanyaan.every((p) => skor[kunciSkor(n.id, p.id)] != null)
  ).length;
  const sisaNominee = nominee.length - sudahDinilai;

  function handleBukaNominee(id) {
    const buka = nomineeTerbuka === id ? null : id;
    setNomineeTerbuka(buka);
    if (buka) {
      setTersentuh((prev) => new Set(prev).add(buka));
    }
  }

  function ubahSkor(nomineeId, pertanyaanId, nilai) {
    setSkor((prev) => ({ ...prev, [kunciSkor(nomineeId, pertanyaanId)]: Number(nilai) }));
    setTersentuh((prev) => new Set(prev).add(nomineeId));
    setHasDraft(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setIsConfirmOpen(true);
  }

  function handleLanjutkanKirim() {
    const daftarSkor = [];
    nominee.forEach((n) => {
      pertanyaan.forEach((p) => {
        daftarSkor.push({ nominee_id: n.id, pertanyaan_id: p.id, skor: skor[kunciSkor(n.id, p.id)] });
      });
    });
    // Pass juga daftar nominee untuk validasi mandatory di service
    onSubmit(daftarSkor, nominee);
  }

  if (nominee.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Star className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500">Belum ada nominee pada periode ini.</p>
      </div>
    );
  }

  const progressPercent = (sudahDinilai / nominee.length) * 100;
  const isAllComplete = sudahDinilai === nominee.length;

  return (
    <div className="space-y-5">
      {/* Progress Header */}
      <div className={`rounded-2xl border p-4 shadow-soft ${
        isAllComplete
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Progress Penilaian</span>
            {!isAllComplete && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                WAJIB
              </span>
            )}
            {isAllComplete && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                LENGKAP
              </span>
            )}
            {hasDraft && !isAllComplete && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1">
                <Save className="h-3 w-3" />
                DRAF TERSIMPAN
              </span>
            )}
          </div>
          <span className={`text-sm font-bold ${
            isAllComplete ? 'text-emerald-700' : 'text-navy-800'
          }`}>
            {sudahDinilai} / {nominee.length} Nominee
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isAllComplete
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-navy-700 to-navy-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className={`mt-2 text-xs ${isAllComplete ? 'text-emerald-600' : 'text-slate-500'}`}>
          {isAllComplete
            ? '✓ Semua nominee sudah dinilai. Anda siap mengirim.'
            : `${totalTerisi} skor harus diisi (${sisaNominee} nominee belum dinilai)`
          }
        </p>
      </div>

      {/* Error Message from Submit */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Gagal mengirim penilaian:</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {nominee.map((n, idx) => {
          const terbuka = nomineeTerbuka === n.id;
          const sudahTerisi = tersentuh.has(n.id) && pertanyaan.every((p) => skor[kunciSkor(n.id, p.id)] != null);
          return (
            <div
              key={n.id}
              className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                terbuka
                  ? 'border-navy-300 bg-white shadow-soft-lg'
                  : sudahTerisi
                    ? 'border-emerald-200 bg-emerald-50/30 shadow-soft hover:shadow-card-hover'
                    : 'border-slate-200 bg-white shadow-soft hover:shadow-card-hover'
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <button
                type="button"
                onClick={() => handleBukaNominee(n.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition-all duration-200"
              >
                <div className="relative">
                  <img
                    src={n.foto_url || (n.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg` : null)}
                    alt={n.nama}
                    className="h-14 w-14 rounded-full border-2 border-slate-200 object-cover shadow-md transition-transform duration-200 hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.nama)}&background=16324a&color=fff&size=128`;
                    }}
                  />
                  {sudahTerisi && (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{n.nama}</p>
                  </div>
                  <p className="truncate text-sm text-slate-500">{n.unit_kerja}</p>
                </div>

                <div className="flex items-center gap-2">
                  {sudahTerisi && !terbuka && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Lengkap
                    </span>
                  )}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${
                      terbuka ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {terbuka && (
                <div className="space-y-5 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/50 px-4 pb-5 pt-4 animate-fade-in">
                  
                  {n.video_profil_link && (
                    <div className="mb-4 overflow-hidden rounded-xl bg-slate-900 shadow-md">
                      <iframe
                        width="100%"
                        height="315"
                        src={getEmbedUrl(n.video_profil_link)}
                        title="Video Profil"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}
                  {pertanyaan.map((p, pIdx) => {
                    const nilai = skor[kunciSkor(n.id, p.id)];
                    const percent = ((nilai - p.skor_min) / (p.skor_max - p.skor_min)) * 100;
                    return (
                      <div
                        key={p.id}
                        className="rounded-xl bg-white p-4 shadow-sm border border-slate-100"
                        style={{ animationDelay: `${pIdx * 30}ms` }}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <label
                            htmlFor={`skor-${n.id}-${p.id}`}
                            className="text-sm font-medium leading-relaxed text-slate-700"
                          >
                            <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-800">
                              {pIdx + 1}
                            </span>
                            {p.teks_pertanyaan}
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const val = Math.max(p.skor_min, nilai - 1);
                                ubahSkor(n.id, p.id, val);
                              }}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={editingId === `${n.id}-${p.id}` ? editingValue : nilai}
                              onFocus={() => {
                                setEditingId(`${n.id}-${p.id}`);
                                setEditingValue(String(nilai));
                              }}
                              onChange={(e) => {
                                // Allow only digits, no leading zeros (except for "0" itself)
                                const raw = e.target.value.replace(/[^0-9]/g, "");
                                setEditingValue(raw);
                              }}
                              onBlur={() => {
                                // Normalize on blur
                                const raw = editingValue.replace(/[^0-9]/g, "");
                                let val = parseInt(raw, 10);
                                if (isNaN(val)) val = nilai; // Keep current if invalid
                                if (val > p.skor_max) val = p.skor_max;
                                if (val < p.skor_min) val = p.skor_min;
                                ubahSkor(n.id, p.id, val);
                                setEditingId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.target.blur();
                              }}
                              className="w-16 shrink-0 rounded-xl border-2 border-navy-200 bg-white py-1.5 text-center text-xl font-black text-navy-900 shadow-inner transition-all focus:border-gold-400 focus:outline-none focus:ring-4 focus:ring-gold-400/20"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = Math.min(p.skor_max, nilai + 1);
                                ubahSkor(n.id, p.id, val);
                              }}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {jawaban && (
                          <div className="mb-3 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50/50 to-blue-50/30 p-3 text-sm text-slate-600 italic">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                              Jawaban dari {n.nama}
                            </p>
                            {jawaban.find((j) => j.nominee_id === n.id && j.pertanyaan_id === p.id)
                              ?.teks_jawaban || (
                              <span className="text-slate-400">Belum ada jawaban narasi.</span>
                            )}
                          </div>
                        )}

                        {/* Custom Slider */}
                        <div className={`relative pt-1 transition-opacity duration-200 ${isConfirmOpen ? 'opacity-0' : 'opacity-100'}`}>
                          <div className="mb-2 flex justify-between text-xs text-slate-400">
                            <span>{p.skor_min}</span>
                            <span>{p.skor_max}</span>
                          </div>
                          <div className="relative">
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-navy-600 to-navy-800 transition-all duration-200"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <input
                              id={`skor-${n.id}-${p.id}`}
                              type="range"
                              min={p.skor_min}
                              max={p.skor_max}
                              value={nilai}
                              onChange={(e) => ubahSkor(n.id, p.id, Number(e.target.value))}
                              className="absolute inset-0 w-full cursor-pointer opacity-0"
                            />
                            <div
                              className="pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-navy-600 to-navy-800 shadow-lg transition-all duration-100"
                              style={{ left: `calc(${percent}% - 10px)` }}
                            >
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={isSubmitting || sudahDinilai < nominee.length}
          className="btn-primary w-full py-4 text-base shadow-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Mengirim Penilaian...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Kirim Penilaian ({sudahDinilai}/{nominee.length} nominee · {totalTerisi} skor)
            </>
          )}
        </button>

        {sudahDinilai < nominee.length && (
          <p className="text-center text-xs text-slate-400">
            Selesaikan penilaian semua nominee untuk mengirim
          </p>
        )}
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleLanjutkanKirim}
        title="Kunci & Kirim Penilaian?"
        message={`Anda akan mengirim penilaian untuk ${nominee.length} nominee. Penilaian bersifat WAJIB untuk semua nominee dan tidak dapat diubah kembali setelah dikirim.`}
      />
    </div>
  );
}

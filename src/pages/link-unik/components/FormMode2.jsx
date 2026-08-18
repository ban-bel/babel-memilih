import { useState, useMemo, useEffect } from 'react';
import { Send, Loader2, ChevronDown, FileText, Download, Star, Gavel, MessageSquare, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import { getSignedUrlBuktiPDF } from '../../../services/votingService';

function kunciSkor(nomineeId, kategoriId) {
  return `${nomineeId}:${kategoriId}`;
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
 * Form Mode 2 — Panel Dewan Juri. Satu kartu per nominee: slider skor per
 * kategori (dengan bobot % ditampilkan sebagai label), plus SATU textarea
 * "Catatan Kualitatif" per nominee (sesuai teks_deskripsi.txt: "per nominee").
 *
 * Skema `penilaian_juri` menyimpan `catatan_juri` per baris (nominee+kategori),
 * bukan satu kolom terpisah per nominee — supaya pembacaan datanya nanti tetap
 * sederhana (ambil baris kategori manapun untuk nominee ybs, catatannya sama),
 * teks catatan yang sama SENGAJA disalin ke semua baris kategori nominee itu
 * saat submit (lihat pembentukan payload di bawah).
 *
 * @param {{id:number,nama:string,unit_kerja:string,foto_url?:string}[]} nominee
 * @param {{id:number,nama_kategori:string,deskripsi?:string,bobot_persen:number,skor_min:number,skor_max:number}[]} kategori
 * @param {{nominee_id:number,pertanyaan_id:number,teks_jawaban?:string,file_url?:string}[]} jawaban
 * @param {(daftarPenilaian: {nominee_id:number,kategori_id:number,skor:number,catatan_juri:string}[]) => void} onSubmit
 * @param {boolean} isSubmitting
 */
export default function FormMode2({ token, nominee, kategori, jawaban, onSubmit, isSubmitting }) {
  const [downloadingUrl, setDownloadingUrl] = useState(null);
  
  const loadDraft = () => {
    if (!token) return null;
    try {
      const saved = localStorage.getItem(`draft_mode2_${token}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to read draft", e);
    }
    return null;
  };

  const draft = useMemo(loadDraft, [token]);

  const nilaiAwal = useMemo(() => {
    if (draft && draft.skor) {
      const rerata = {};
      kategori.forEach((k) => {
        const tengah = Math.round((k.skor_min + k.skor_max) / 2);
        nominee.forEach((n) => {
          const key = kunciSkor(n.id, k.id);
          rerata[key] = draft.skor[key] !== undefined ? draft.skor[key] : tengah;
        });
      });
      return rerata;
    }
    const rerata = {};
    kategori.forEach((k) => {
      const tengah = Math.round((k.skor_min + k.skor_max) / 2);
      nominee.forEach((n) => {
        rerata[kunciSkor(n.id, k.id)] = tengah;
      });
    });
    return rerata;
  }, [nominee, kategori, draft]);

  const [skor, setSkor] = useState(nilaiAwal);
  const [catatan, setCatatan] = useState(() => draft?.catatan || {});
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
    if (hasDraft || tersentuh.size > 1 || Object.keys(catatan).length > 0) {
      localStorage.setItem(`draft_mode2_${token}`, JSON.stringify({
        skor,
        catatan,
        tersentuh: Array.from(tersentuh)
      }));
    }
  }, [skor, catatan, tersentuh, hasDraft, token]);
  // Track which input is being edited and its temporary value
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const sudahDinilai = nominee.filter(
    (n) => tersentuh.has(n.id) && kategori.every((k) => skor[kunciSkor(n.id, k.id)] != null)
  ).length;

  const progressPercent = (sudahDinilai / nominee.length) * 100;

  function handleBukaNominee(id) {
    const buka = nomineeTerbuka === id ? null : id;
    setNomineeTerbuka(buka);
    if (buka) {
      setTersentuh((prev) => new Set(prev).add(buka));
    }
  }

  function ubahSkor(nomineeId, kategoriId, nilai) {
    setSkor((prev) => ({ ...prev, [kunciSkor(nomineeId, kategoriId)]: Number(nilai) }));
    setTersentuh((prev) => new Set(prev).add(nomineeId));
    setHasDraft(true);
    // Auto-save toast hanya muncul setiap 2 detik untuk avoid spam
    if (!document.querySelector('[data-toast-auto-save]')) {
      toast.success('Disimpan otomatis', {
        id: 'auto-save',
        icon: '✅',
        duration: 1000,
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setIsConfirmOpen(true);
  }

  function handleLanjutkanKirim() {
    const daftarPenilaian = [];
    nominee.forEach((n) => {
      const catatanNominee = catatan[n.id]?.trim() || null;
      kategori.forEach((k) => {
        daftarPenilaian.push({
          nominee_id: n.id,
          kategori_id: k.id,
          skor: skor[kunciSkor(n.id, k.id)],
          catatan_juri: catatanNominee, // disalin ke semua baris kategori nominee ybs
        });
      });
    });
    onSubmit(daftarPenilaian);
  }

  if (nominee.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Gavel className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500">Belum ada nominee pada periode ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress Header */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-navy-700" />
            <span className="text-sm font-medium text-slate-700">Progress Penilaian Juri</span>
            {hasDraft && sudahDinilai < nominee.length && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1 ml-2">
                <Save className="h-3 w-3" />
                DRAF TERSIMPAN
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-navy-800">
            {sudahDinilai} / {nominee.length} Nominee
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-navy-700 to-gold-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {nominee.map((n, idx) => {
          const terbuka = nomineeTerbuka === n.id;
          const sudahTerisi =
            tersentuh.has(n.id) && kategori.every((k) => skor[kunciSkor(n.id, k.id)] != null);
          const jawabanNominee = jawaban?.filter((j) => j.nominee_id === n.id);
          const hasJawaban = jawabanNominee?.some((j) => j.teks_jawaban || j.file_url);

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
                  {hasJawaban && (
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow">
                      <FileText className="h-3 w-3" />
                    </div>
                  )}
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
                    <span className="shrink-0 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-semibold text-navy-700">
                      {kategori.length} Kategori
                    </span>
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
                  
                  {/* Video Profil (jika ada) */}
                  {n.video_profil_link && (
                    <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-md border border-slate-800/20">
                      <iframe
                        className="w-full h-full"
                        src={getEmbedUrl(n.video_profil_link)}
                        title="Video Profil"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  )}

                  {/* Bukti Dukung dari Nominee */}
                  {hasJawaban && (
                    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/50 to-blue-100/30 p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-800">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        Bukti Dukung & Portofolio Nominee
                      </h4>
                      <div className="space-y-3">
                        {jawabanNominee
                          .filter((j) => j.teks_jawaban || j.file_url)
                          .map((j, jIdx) => (
                            <div
                              key={jIdx}
                              className="rounded-lg border border-blue-100/50 bg-white p-3 shadow-sm"
                            >
                              {j.teks_jawaban && (
                                <div className="mb-2 text-sm leading-relaxed text-slate-700">
                                  {j.teks_jawaban.match(/https?:\/\/[^\s]+/) ? (
                                    <a href={j.teks_jawaban.match(/https?:\/\/[^\s]+/)[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium bg-blue-50 py-1.5 px-3 rounded-lg border border-blue-100 inline-flex">
                                      Buka Link Dokumen
                                    </a>
                                  ) : (
                                    <p className="italic">"{j.teks_jawaban}"</p>
                                  )}
                                </div>
                              )}
                              {j.file_url && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      setDownloadingUrl(j.file_url);
                                      const url = await getSignedUrlBuktiPDF(j.file_url);
                                      window.open(url, '_blank');
                                    } catch (e) {
                                      alert(e.message);
                                    } finally {
                                      setDownloadingUrl(null);
                                    }
                                  }}
                                  disabled={downloadingUrl === j.file_url}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
                                >
                                  {downloadingUrl === j.file_url ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Download className="h-3.5 w-3.5" />
                                  )}
                                  Unduh Dokumen Bukti
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Kategori Penilaian */}
                  <div className="space-y-4">
                    {kategori.map((k, kIdx) => {
                      const nilai = skor[kunciSkor(n.id, k.id)];
                      const percent =
                        ((nilai - k.skor_min) / (k.skor_max - k.skor_min)) * 100;

                      return (
                        <div
                          key={k.id}
                          className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                          style={{ animationDelay: `${kIdx * 30}ms` }}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-100 text-[10px] font-bold text-gold-700">
                                  {kIdx + 1}
                                </span>
                                <label
                                  htmlFor={`skor-${n.id}-${k.id}`}
                                  className="text-sm font-semibold text-slate-800"
                                >
                                  {k.nama_kategori}
                                </label>
                              </div>
                              {k.deskripsi && (
                                <p className="ml-8 mt-0.5 text-xs text-slate-500">{k.deskripsi}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-end gap-3">
                              <div className="flex flex-col items-end">
                                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-gold-700">
                                  Bobot {k.bobot_persen}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const val = Math.max(k.skor_min, nilai - 1);
                                    ubahSkor(n.id, k.id, val);
                                  }}
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={editingId === `${n.id}-${k.id}` ? editingValue : nilai}
                                  onFocus={() => {
                                    setEditingId(`${n.id}-${k.id}`);
                                    setEditingValue(String(nilai));
                                  }}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/[^0-9]/g, "");
                                    setEditingValue(raw);
                                  }}
                                  onBlur={() => {
                                    const raw = editingValue.replace(/[^0-9]/g, "");
                                    let val = parseInt(raw, 10);
                                    if (isNaN(val)) val = nilai;
                                    if (val > k.skor_max) val = k.skor_max;
                                    if (val < k.skor_min) val = k.skor_min;
                                    ubahSkor(n.id, k.id, val);
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
                                    const val = Math.min(k.skor_max, nilai + 1);
                                    ubahSkor(n.id, k.id, val);
                                  }}
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Custom Slider */}
                          <div className={`relative pt-1 transition-opacity duration-200 ${isConfirmOpen ? 'opacity-0' : 'opacity-100'}`}>
                            <div className="mb-2 flex justify-between text-xs text-slate-400">
                              <span>{k.skor_min}</span>
                              <span>{k.skor_max}</span>
                            </div>
                            <div className="relative">
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-200"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <input
                                id={`skor-${n.id}-${k.id}`}
                                type="range"
                                min={k.skor_min}
                                max={k.skor_max}
                                value={nilai}
                                onChange={(e) => ubahSkor(n.id, k.id, Number(e.target.value))}
                                className="absolute inset-0 w-full cursor-pointer opacity-0"
                              />
                              <div
                                className="pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-600 shadow-lg transition-all duration-100"
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

                  {/* Catatan Kualitatif */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <label
                      htmlFor={`catatan-${n.id}`}
                      className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                    >
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                      Catatan Kualitatif / Kritik & Saran
                    </label>
                    <textarea
                      id={`catatan-${n.id}`}
                      rows={3}
                      value={catatan[n.id] ?? ''}
                      onChange={(e) => {
                        setCatatan((prev) => ({ ...prev, [n.id]: e.target.value }));
                        setTersentuh((prev) => new Set(prev).add(n.id));
                        setHasDraft(true);
                      }}
                      placeholder="Tuliskan catatan kualitatif untuk nominee ini (opsional)..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">
                      Catatan ini akan dibaca oleh Kepala Kantor
                    </p>
                  </div>
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
              <Gavel className="h-5 w-5" />
              Kirim Penilaian Juri ({sudahDinilai}/{nominee.length} nominee)
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
        title="Kunci & Kirim Penilaian Juri?"
        message="Apakah Anda yakin? Penilaian (skor & catatan) yang sudah dikirim tidak dapat diubah kembali."
      />
    </div>
  );
}

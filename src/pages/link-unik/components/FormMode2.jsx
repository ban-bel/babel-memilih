import { useState, useMemo, useEffect } from 'react';
import { Send, Loader2, ChevronDown, FileText, Download, Star, Gavel, MessageSquare, Save, CloudDownload, Check, Link as LinkIcon } from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import PortofolioViewer from '../../../components/common/PortofolioViewer';
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

function getPreviewUrl(url) {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    return url.replace(/\/view.*$/, '/preview');
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
export default function FormMode2({ token, nominee, kategori, pertanyaan, jawaban, onSubmit, isSubmitting }) {
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
  const [openedNominee, setOpenedNominee] = useState(null);
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

  // Sinkronisasi Cloud Draft saat pertama kali dimuat
  useEffect(() => {
    async function syncCloudDraft() {
      if (!token) return;
      try {
        const { getDraftFromServer } = await import('../../../services/votingService');
        const cloudDraft = await getDraftFromServer(token, '2');
        if (cloudDraft && Object.keys(cloudDraft).length > 0) {
          const cloudSentuhCount = cloudDraft.tersentuh ? cloudDraft.tersentuh.length : 0;
          if (cloudSentuhCount >= tersentuh.size) {
            setSkor((prev) => ({ ...prev, ...cloudDraft.skor }));
            if (cloudDraft.catatan) setCatatan((prev) => ({ ...prev, ...cloudDraft.catatan }));
            if (cloudDraft.tersentuh) setTersentuh(new Set(cloudDraft.tersentuh));
            toast.success('Progress dikembalikan dari Cloud (Server)!', {
              icon: '☁️',
              duration: 3000
            });
          }
        }
      } catch (e) {
        console.warn('Gagal load cloud draft:', e);
      }
    }
    syncCloudDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      {/* Progress Header & Action */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch mb-2">
        <div className="flex-1 rounded-2xl bg-white border border-slate-200 p-4 shadow-soft flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Gavel className="h-5 w-5 text-navy-700" />
              <span className="text-sm font-medium text-slate-700">Progress Penilaian Juri</span>
              {hasDraft && sudahDinilai < nominee.length && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  DRAF TERSIMPAN
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-navy-800 ml-2">
              {sudahDinilai} / {nominee.length}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy-700 to-gold-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            const loadingToast = toast.loading('Menyimpan draft ke server...');
            try {
              const { saveDraftToServer } = await import('../../../services/votingService');
              await saveDraftToServer(token, '2', { skor, catatan, tersentuh: Array.from(tersentuh) });
              toast.success('Draft berhasil disimpan ke server!', { id: loadingToast });
            } catch (e) {
              toast.error('Gagal menyimpan ke server. ' + e.message, { id: loadingToast });
            }
          }}
          className="flex md:w-auto w-full items-center justify-center gap-2 rounded-2xl border-2 border-navy-200 bg-white px-6 py-4 text-sm font-bold text-navy-700 shadow-soft hover:bg-navy-50 hover:border-navy-400 transition-all active:scale-[0.98]"
        >
          <CloudDownload className="h-5 w-5" />
          Simpan Draft (Cloud)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {nominee.map((n, idx) => {
            const sudahTerisi =
              tersentuh.has(n.id) && kategori.every((k) => skor[kunciSkor(n.id, k.id)] != null);
            
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => setOpenedNominee(n)}
                className={`flex flex-col h-full group relative overflow-hidden rounded-2xl border-2 p-5 sm:p-6 text-center transition-all duration-300 ${
                  sudahTerisi
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 shadow-soft-lg scale-[1.02]'
                    : 'border-slate-200 bg-white shadow-soft hover:border-navy-300 hover:shadow-card-hover'
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Selection Indicator */}
                {sudahTerisi && (
                  <div className="absolute inset-0 bg-emerald-800/5 pointer-events-none"></div>
                )}
                
                <div className={`relative mx-auto mb-3 sm:mb-4 w-fit transition-all duration-300 ${sudahTerisi ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <img
                    src={n.foto_url || (n.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg` : null)}
                    alt={n.nama}
                    className={`relative w-20 sm:w-28 aspect-square h-auto rounded-full border-4 ${
                      sudahTerisi ? 'border-emerald-400 shadow-emerald-200' : 'border-white'
                    } object-cover shadow-lg transition-all duration-300`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.nama || 'N')}&background=16324a&color=fff&size=64`;
                    }}
                  />
                  {sudahTerisi && (
                    <div className="absolute bottom-0 right-0 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg border-[3px] border-white animate-bounce-in">
                      <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  )}
                </div>
  
                <p className={`text-[13px] sm:text-[15px] font-bold transition-colors duration-200 leading-[1.15] mt-1.5 mb-0.5 ${
                  sudahTerisi ? 'text-emerald-900' : 'text-slate-800 group-hover:text-navy-800'
                }`}>
                  {n.nama}
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-[1.15] mb-2">{n.unit_kerja}</p>
  
                <div className={`relative z-10 mt-auto w-full py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 border-none leading-tight ${
                  sudahTerisi 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white' 
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                }`}>
                  {sudahTerisi ? 'Ubah Penilaian' : 'Mulai Penilaian'}
                </div>
              </button>
            );
          })}
        </div>

        <Modal isOpen={!!openedNominee} onClose={() => setOpenedNominee(null)} title="Lembar Penilaian Juri" maxWidth="max-w-4xl">
          {openedNominee && (
            <div className="space-y-8 -mt-2">
              
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 p-5 sm:p-6 bg-gradient-to-br from-navy-50 to-slate-50 rounded-2xl border-2 border-navy-100 shadow-sm">
                <img
                    src={openedNominee.foto_url || (openedNominee.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${openedNominee.nip}.jpg` : null)}
                    alt={openedNominee.nama}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(openedNominee.nama || 'N')}&background=16324a&color=fff&size=64`;
                    }}
                />
                <div className="flex-1 text-center sm:text-left flex flex-col justify-center min-h-[6rem]">
                   <h2 className="text-xl sm:text-3xl font-bold text-navy-900 leading-tight mb-2">{openedNominee.nama}</h2>
                   <p className="text-sm sm:text-base font-medium text-slate-600 bg-white/60 inline-flex items-center sm:self-start px-3 py-1.5 rounded-lg border border-slate-200">
                     🏢 {openedNominee.unit_kerja}
                   </p>
                </div>
              </div>

              
              {(() => {
                const showPdfTab = Boolean(openedNominee.dokumen_link);
                const previewUrl = getPreviewUrl(openedNominee.dokumen_link);
                return showPdfTab && (
                  <div className="mt-8 flex-1 flex flex-col min-h-[500px] animate-fade-in">
                    <h4 className="font-semibold text-navy-900 flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-navy-500" />
                      Preview Dokumen: Paparan
                    </h4>
                    <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white min-h-[400px]">
                      <iframe
                        src={previewUrl}
                        title="PDF Viewer"
                        className="w-full h-full border-none"
                        allow="autoplay"
                      ></iframe>
                    </div>
                  </div>
                );
              })()}


              {/* Daftar Isian / Pertanyaan Dinamis */}
              {pertanyaan?.length > 0 && (
                <div className="space-y-4 mt-8">
                  {pertanyaan.map((p) => {
                    const jaw = jawaban?.find((j) => j.nominee_id === openedNominee.id && j.pertanyaan_id === p.id);
                    const isLink = jaw?.teks_jawaban && jaw.teks_jawaban.trim().match(/^https?:\/\//);
                    return (
                      <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-700">{p.urutan}. {p.teks_pertanyaan}</h4>
                        <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap break-all">
                          {jaw?.teks_jawaban ? (
                            <div className="space-y-2">
                              {isLink ? (
                                <a href={jaw.teks_jawaban.trim()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                  <LinkIcon className="h-4 w-4" /> Buka Tautan ({p.teks_pertanyaan})
                                </a>
                              ) : (
                                <div>{jaw.teks_jawaban}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Belum ada isian/jawaban.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 space-y-4">
                <PortofolioViewer 
                  type="portofolio_pengembangan" 
                  title="Pengembangan Diri" 
                  icon="📚" 
                  portofolio={openedNominee?.portofolio_pengembangan} 
                />
                
                <PortofolioViewer 
                  type="portofolio_inovasi" 
                  title="Inovasi" 
                  icon="💡" 
                  portofolio={openedNominee?.portofolio_inovasi} 
                />
                
                <PortofolioViewer 
                  type="portofolio_penghargaan" 
                  title="Penghargaan" 
                  icon="🏆" 
                  portofolio={openedNominee?.portofolio_penghargaan} 
                />
              </div>
              
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-navy-900 mb-6">Formulir Penilaian</h3>
                <div className="space-y-6">
                  {kategori.map((k) => {
                    if (!k) return null;
                    const n = openedNominee;
                    const nilai = skor[kunciSkor(n.id, k.id)];
                    const percent = ((nilai - k.skor_min) / (k.skor_max - k.skor_min)) * 100;
                    return (
                      <div
                        key={k.id}
                        className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex flex-col sm:flex-row items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-xs font-bold text-gold-700">
                                <Star className="h-4 w-4" />
                              </span>
                              <label htmlFor={`skor-${n.id}-${k.id}`} className="text-base sm:text-lg font-bold text-slate-800">
                                {k.nama_kategori}
                              </label>
                            </div>
                            {k.deskripsi && <p className="ml-10 mt-1 text-sm text-slate-500">{k.deskripsi}</p>}
                          </div>
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex flex-col items-end">
                              <span className="rounded-full bg-gold-100 px-2.5 py-1 text-sm font-bold text-gold-700">Bobot {k.bobot_persen}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Math.max(k.skor_min, nilai - 1);
                                  ubahSkor(n.id, k.id, val);
                                }}
                                className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-2xl sm:text-3xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
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
                                className="w-20 sm:w-24 shrink-0 rounded-xl border-2 border-navy-200 bg-white py-2 sm:py-2.5 text-center text-2xl sm:text-3xl font-black text-navy-900 shadow-inner transition-all focus:border-gold-400 focus:outline-none focus:ring-4 focus:ring-gold-400/20"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = Math.min(k.skor_max, nilai + 1);
                                  ubahSkor(n.id, k.id, val);
                                }}
                                className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-2xl sm:text-3xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
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
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <label
                    htmlFor={`catatan-${openedNominee.id}`}
                    className="mb-2 flex items-center gap-2 text-base font-bold text-slate-700"
                  >
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    Catatan Kualitatif / Kritik & Saran
                  </label>
                  <textarea
                    id={`catatan-${openedNominee.id}`}
                    rows={3}
                    value={catatan[openedNominee.id] ?? ''}
                    onChange={(e) => {
                      setCatatan((prev) => ({ ...prev, [openedNominee.id]: e.target.value }));
                      setTersentuh((prev) => new Set(prev).add(openedNominee.id));
                      setHasDraft(true);
                    }}
                    placeholder="Tuliskan catatan kualitatif untuk nominee ini (opsional)..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-800 placeholder:text-slate-400 transition-all focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20 focus:outline-none"
                  />
                  <p className="mt-2 text-sm text-slate-400">
                    Catatan ini akan dibaca oleh Kepala Kantor
                  </p>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpenedNominee(null)}
                    className="btn-primary py-4 px-10 text-lg shadow-lg bg-gradient-to-r from-navy-800 to-navy-700 hover:from-navy-700 hover:to-navy-600"
                  >
                    Selesai Menilai {openedNominee.nama}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        <div className="flex flex-col gap-3">
          {sudahDinilai === nominee.length ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-5 text-lg font-bold shadow-lg animate-fade-in"
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
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-base font-medium text-slate-500">
                Tombol kirim akan muncul setelah Anda menyelesaikan penilaian untuk semua nominee.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                (Baru menilai {sudahDinilai} dari {nominee.length} nominee)
              </p>
            </div>
          )}


        </div>
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

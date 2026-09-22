import { useState, useEffect } from 'react';
import { 
  Send, 
  Loader2, 
  Check, 
  Heart, 
  ShieldCheck, 
  Search, 
  AlertCircle, 
  Sparkles, 
  Users 
} from 'lucide-react';
import Modal from '../../../components/common/Modal';
import { KENALAN_BTN_LABEL } from '../../../utils/votingConstants';

/**
 * GridPionirVote — Tampilan Voting Cepat Mode PIONIR (Fase 2: Voting Umum Terbuka LUBER).
 * Mengadopsi tata letak kartu foto melingkar Quick Vote (Mode 1B) yang proporsional,
 * rapi, dan responsif.
 *
 * @param {object} periode
 * @param {Array} kandidatList - Daftar kandidat resmi hasil usulan Fase 1
 * @param {(kandidatId: number) => void} onSubmit
 * @param {boolean} isSubmitting
 * @param {string|null} errorMessage
 */
export default function GridPionirVote({
  periode,
  kandidatList = [],
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) {
  const [pilihan, setPilihan] = useState(null);
  const [kataCari, setKataCari] = useState('');
  const [hoveredId, setHoveredId] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [profilDetail, setProfilDetail] = useState(null);
  const [shuffledKandidat, setShuffledKandidat] = useState([]);

  // Anti-bias random order shuffling on mount
  useEffect(() => {
    if (kandidatList && kandidatList.length > 0 && shuffledKandidat.length === 0) {
      setShuffledKandidat([...kandidatList].sort(() => Math.random() - 0.5));
    }
  }, [kandidatList, shuffledKandidat.length]);

  const daftarTampil = (shuffledKandidat.length > 0 ? shuffledKandidat : kandidatList).filter((k) => {
    if (!kataCari.trim()) return true;
    const q = kataCari.toLowerCase();
    return (
      (k.nama && k.nama.toLowerCase().includes(q)) ||
      (k.jabatan && k.jabatan.toLowerCase().includes(q)) ||
      (k.unit_kerja && k.unit_kerja.toLowerCase().includes(q)) ||
      (k.kata_pengusul && k.kata_pengusul.toLowerCase().includes(q))
    );
  });

  const selectedKandidat = kandidatList.find((k) => k.id === pilihan);

  function getFotoUrl(k) {
    if (!k) return '';
    return (
      k.foto_url ||
      (k.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${k.nip}.jpg` : null) ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(k.nama || 'K')}&background=16324a&color=fff&size=160`
    );
  }

  function parseKataPengusul(kataString) {
    if (!kataString) return [];
    return kataString
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
  }

  if (kandidatList.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500 space-y-3 shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Users className="h-8 w-8 text-slate-400" />
        </div>
        <p className="font-semibold text-lg text-slate-700">Belum Ada Kandidat Resmi</p>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Belum ada rekan kerja yang diajukan oleh Tim Pengusul pada Fase 1 untuk periode penilaian ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner Quick Vote — Desain Lembut & Selaras dengan Quick Vote */}
      <div className="rounded-2xl bg-gradient-to-r from-gold-500/15 via-amber-500/10 to-gold-500/5 border border-gold-200/70 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-amber-500 text-white shadow-sm">
            <Heart className="h-5 w-5 text-white fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3" /> Fase 2: Voting LUBER
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                Bobot Suara: 40%
              </span>
            </div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base">
              Pemilihan {periode?.nama_periode || 'Insan Teladan (PIONIR)'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Tentukan pilihan Anda dengan cermat. Berikan 1 suara terbaik secara rahasia dan aman.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pencarian Hanya Ditampilkan Jika Kandidat Banyak (> 4) */}
      {kandidatList.length > 4 && (
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau unit kerja..."
            value={kataCari}
            onChange={(e) => setKataCari(e.target.value)}
            className="input pl-10 w-full text-xs sm:text-sm border-slate-200 focus:border-navy-600 rounded-xl bg-white shadow-2xs"
          />
        </div>
      )}

      {/* Grid Kartu Kandidat Bergaya Quick Vote */}
      {daftarTampil.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 space-y-2">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-sm">Tidak Ada Kandidat yang Cocok</p>
          <p className="text-xs text-slate-400">Coba kata kunci pencarian lainnya.</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
          {daftarTampil.map((k, idx) => {
            const terpilih = pilihan === k.id;
            const isHovered = hoveredId === k.id;
            const daftarKata = parseKataPengusul(k.kata_pengusul);

            // Responsive sizing: single candidate gets a generous centered card
            const widthClass = 
              daftarTampil.length === 1
                ? 'w-full max-w-sm'
                : daftarTampil.length === 2
                ? 'w-full sm:w-[calc(50%-0.75rem)] max-w-sm'
                : 'w-[calc((100%-1rem)/2)] sm:w-[calc((100%-2rem)/3)] max-w-xs';

            return (
              <div
                key={k.id}
                onClick={() => setPilihan(k.id)}
                onMouseEnter={() => setHoveredId(k.id)}
                onMouseLeave={() => setHoveredId(null)}
                aria-pressed={terpilih}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPilihan(k.id);
                  }
                }}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 p-5 text-center transition-all duration-300 cursor-pointer select-none ${
                  terpilih
                    ? 'border-navy-800 bg-gradient-to-br from-navy-50/90 via-white to-navy-50/60 shadow-soft-lg scale-[1.02] ring-2 ring-navy-700/20'
                    : 'border-slate-200 bg-white shadow-soft hover:border-navy-300 hover:shadow-card-hover'
                } ${widthClass}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Checkmark Badge Ketika Terpilih */}
                {terpilih && (
                  <div className="absolute top-3.5 right-3.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-white shadow-md animate-bounce-in">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}

                <div>
                  {/* Foto Melingkar Besar dengan Halo Cahaya Emas */}
                  <div className={`relative mx-auto mb-4 w-fit transition-all duration-300 ${terpilih ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <div
                      className={`absolute inset-0 rounded-full transition-all duration-300 ${
                        terpilih
                          ? 'bg-gradient-to-br from-gold-400 to-gold-500 blur-md opacity-50 scale-110'
                          : isHovered
                          ? 'bg-gradient-to-br from-gold-300/40 to-gold-400/40 blur-md opacity-30 scale-105'
                          : ''
                      }`}
                    />
                    <img
                      src={getFotoUrl(k)}
                      alt={k.nama}
                      className="relative h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-white object-cover shadow-lg transition-all duration-300 bg-slate-100"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(k.nama || 'K')}&background=16324a&color=fff&size=160`;
                      }}
                    />
                    {terpilih && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-white shadow-lg">
                          <Heart className="h-3 w-3 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lencana Jumlah Pengusul */}
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                      <Users className="h-3 w-3 text-navy-600" />
                      {k.jumlah_pengusul} Pengusul
                    </span>
                  </div>

                  {/* Informasi Kandidat: Nama Lengkap Tanpa Terpotong */}
                  <h3
                    className={`font-bold text-sm sm:text-base transition-colors duration-200 line-clamp-2 px-1 ${
                      terpilih ? 'text-navy-900' : 'text-slate-800 group-hover:text-navy-800'
                    }`}
                  >
                    {k.nama}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1 font-medium">
                    {k.jabatan || 'Pegawai'}
                  </p>
                  <p className="text-xs text-navy-700/90 font-medium line-clamp-1 mt-0.5">
                    {k.unit_kerja}
                  </p>

                  {/* Kata Keteladanan dari Pengusul */}
                  {daftarKata.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {daftarKata.slice(0, 3).map((kata, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-xl bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-2xs"
                        >
                          ✨ "{kata}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tombol Kenalan Dulu Yuk */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfilDetail(k);
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 shadow-xs hover:shadow-md ${
                      terpilih
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:-translate-y-0.5'
                    }`}
                  >
                    {KENALAN_BTN_LABEL}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol Kirim / Konfirmasi Suara Langsung Bersih */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pilihan != null) {
            setIsConfirmOpen(true);
          }
        }}
        className="space-y-3 pt-3"
      >
        <button
          type="submit"
          disabled={isSubmitting || pilihan == null}
          className={`w-full py-4 text-base font-semibold transition-all duration-300 rounded-2xl shadow-lg ${
            pilihan == null
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'btn-primary bg-gradient-to-r from-navy-800 to-navy-700 hover:from-navy-700 hover:to-navy-600 text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Mengirim Suara...
            </span>
          ) : pilihan == null ? (
            <span className="flex items-center justify-center gap-2">
              <Heart className="h-5 w-5 text-slate-400" />
              Pilih salah satu kandidat
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2 truncate px-2">
              <Send className="h-5 w-5 text-gold-400 shrink-0" />
              <span className="truncate">Konfirmasi Pilihan untuk {selectedKandidat?.nama}</span>
            </span>
          )}
        </button>

        {pilihan == null && (
          <p className="text-center text-xs text-slate-400">
            Silakan klik salah satu kartu di atas untuk menentukan pilihan Anda.
          </p>
        )}
      </form>

      {/* Modal Konfirmasi Vote LUBER */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Konfirmasi Hak Suara Anda"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-navy-200 bg-navy-50/70 p-4 space-y-3">
            <p className="text-xs text-navy-800 font-medium">
              Anda akan memberikan hak suara Anda kepada:
            </p>
            <div className="flex items-center gap-3.5 border-t border-navy-200/60 pt-3">
              <img
                src={getFotoUrl(selectedKandidat)}
                alt={selectedKandidat?.nama}
                className="h-16 w-16 shrink-0 rounded-full border-2 border-white object-cover shadow-sm bg-white"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedKandidat?.nama || 'P')}&background=16324a&color=fff`;
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-[10px] font-bold text-navy-800 mb-1">
                  <Users className="h-3 w-3" />
                  {selectedKandidat?.jumlah_pengusul} Pengusul
                </div>
                <h4 className="font-bold text-navy-900 text-base">{selectedKandidat?.nama}</h4>
                <p className="text-xs text-slate-600">{selectedKandidat?.nip_baru || selectedKandidat?.nip || '-'} • {selectedKandidat?.jabatan}</p>
                <p className="text-xs text-navy-700 font-semibold mt-0.5">{selectedKandidat?.unit_kerja}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Jaminan Kerahasiaan LUBER (Langsung, Bebas, Rahasia)</p>
              <p className="text-emerald-800/90 leading-relaxed">
                Pilihan Anda dicatat secara anonim dengan voter token yang terenkripsi. Suara ini berkontribusi <strong>40%</strong> dari total evaluasi akhir dan tidak dapat diubah setelah dikonfirmasi.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                setIsConfirmOpen(false);
                if (selectedKandidat) {
                  onSubmit(selectedKandidat.id);
                }
              }}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-900 text-sm font-semibold text-white shadow-md transition-all inline-flex items-center gap-2 hover:scale-[1.01]"
            >
              <Check className="h-4 w-4 text-emerald-400" />
              {isSubmitting ? 'Mencatat Suara...' : 'Ya, Kirim Suara Sekarang'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Rekam Jejak & Testimoni Pengusul */}
      <Modal
        isOpen={Boolean(profilDetail)}
        onClose={() => setProfilDetail(null)}
        title="Rekam Jejak & Keteladanan"
      >
        {profilDetail && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-navy-50/50 border border-slate-200 text-center sm:text-left">
              <img
                src={getFotoUrl(profilDetail)}
                alt={profilDetail.nama}
                className="h-20 w-20 rounded-full border-3 border-white object-cover shadow-md bg-white shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-[11px] font-bold text-navy-900 mb-1.5">
                  <Users className="h-3 w-3 text-navy-700" />
                  Diusulkan oleh {profilDetail.jumlah_pengusul} Tim Pengusul
                </span>
                <h3 className="text-lg font-bold text-navy-900">{profilDetail.nama}</h3>
                <p className="text-xs text-slate-600">{profilDetail.nip_baru || profilDetail.nip || '-'} • {profilDetail.jabatan}</p>
                <p className="text-xs text-navy-700 font-semibold mt-0.5">{profilDetail.unit_kerja}</p>
              </div>
            </div>

            {/* Testimoni Kata Pengusul */}
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Kata Keteladanan dari Pengusul (Fase 1):</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {parseKataPengusul(profilDetail.kata_pengusul).length > 0 ? (
                  parseKataPengusul(profilDetail.kata_pengusul).map((kata, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-xl bg-white border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-2xs"
                    >
                      🌟 "{kata}"
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Belum ada catatan deskripsi.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setProfilDetail(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setPilihan(profilDetail.id);
                  setProfilDetail(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-navy-800 to-navy-700 hover:from-navy-700 hover:to-navy-600 text-sm font-semibold text-white shadow-md transition-all inline-flex items-center gap-2"
              >
                <Heart className="h-4 w-4 text-gold-400 fill-current" />
                Pilih Rekan Ini
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}



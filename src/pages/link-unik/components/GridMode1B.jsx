import { useState, useEffect } from 'react';
import { Send, Loader2, Check, Heart, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../../components/common/ConfirmModal';
import ProfilNomineeModal from '../../../components/common/ProfilNomineeModal';
import Modal from '../../../components/common/Modal';

/**
 * Form Mode 1B — Quick Vote / Pegawai Terfavorit. Grid kartu foto nominee,
 * pilih 1 lalu kirim. `nominee` yang diterima SUDAH melewati Anti Self-Vote
 * Filter di votingService.fetchDaftarNominee.
 *
 * @param {{id:number,nama:string,unit_kerja:string,foto_url?:string}[]} nominee
 * @param {object} periode
 * @param {(nomineeId:number) => void} onSubmit
 * @param {boolean} isSubmitting
 */
export default function GridMode1B({ nominee, periode, onSubmit, isSubmitting }) {
  const [pilihan, setPilihan] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [profilNominee, setProfilNominee] = useState(null);
  const [readProfiles, setReadProfiles] = useState(new Set());
  const [warningNominee, setWarningNominee] = useState(null);
  const [shuffledNominee, setShuffledNominee] = useState([]);

  useEffect(() => {
    if (nominee && nominee.length > 0 && shuffledNominee.length === 0) {
      setShuffledNominee([...nominee].sort(() => Math.random() - 0.5));
    }
  }, [nominee, shuffledNominee.length]);

  const hasTabel = (tabelData) => {
    if (!tabelData) return false;
    let arr = [];
    if (Array.isArray(tabelData)) arr = tabelData;
    else if (typeof tabelData === 'string') {
      try { arr = JSON.parse(tabelData); } catch (e) { return false; }
    }
    return arr.length > 0;
  };

  const selectedNominee = pilihan === 'abstain' ? { id: 'abstain', nama: 'Abstain / Tidak Memilih', foto_url: 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png' } : nominee.find((n) => n.id === pilihan);
  if (nominee.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Heart className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500">Belum ada nominee pada periode ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-gold-500/10 to-gold-500/5 border border-gold-200/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100">
            <Heart className="h-5 w-5 text-gold-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Pemilihan {periode?.nama_periode}</p>
            <p className="text-xs text-slate-500">Tentukan pilihan Anda dengan cermat dan berikan suara untuk insan terbaik.</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex flex-wrap justify-center gap-4">
        {(shuffledNominee.length > 0 ? shuffledNominee : nominee).map((n, idx) => {
          const terpilih = pilihan === n.id;
          const isHovered = hoveredId === n.id;

          return (
            <button
              type="button"
              key={n.id}
              onClick={() => setPilihan(n.id)}
              onMouseEnter={() => setHoveredId(n.id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-pressed={terpilih}
              className={`w-[calc((100%-1rem)/2)] sm:w-[calc((100%-2rem)/3)] group relative overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
                terpilih
                  ? 'border-navy-800 bg-gradient-to-br from-navy-50 to-navy-100/50 shadow-soft-lg scale-[1.02]'
                  : 'border-slate-200 bg-white shadow-soft hover:border-navy-300 hover:shadow-card-hover'
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Selection Indicator */}
              {terpilih && (
                <div className="absolute inset-0 flex items-center justify-center bg-navy-800/5">
                  <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-white shadow-lg animate-bounce-in">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}

              {/* Avatar with Glow Effect */}
              <div className={`relative mx-auto mb-4 w-fit transition-all duration-300 ${terpilih ? 'scale-110' : 'group-hover:scale-105'}`}>
                <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                  terpilih ? 'bg-gradient-to-br from-gold-400 to-gold-500 blur-md opacity-50 scale-110' :
                  isHovered ? 'bg-gradient-to-br from-gold-300/50 to-gold-400/50 blur-md opacity-30 scale-105' : ''
                }`} />
                <img
                  src={n.foto_url || (n.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg` : null)}
                  alt={n.nama}
                  className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-white object-cover shadow-lg transition-all duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.nama || 'N')}&background=16324a&color=fff&size=128`;
                  }}
                />
                {terpilih && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-white shadow-lg">
                      <Heart className="h-3 w-3 fill-current" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <p className={`truncate text-sm font-semibold transition-colors duration-200 ${
                terpilih ? 'text-navy-900' : 'text-slate-800 group-hover:text-navy-800'
              }`}>
                {n.nama}
              </p>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{n.unit_kerja}</p>

              {/* Lihat Profil Button (Only if has data) */}
              {(n.dokumen_link || (periode?.is_tabel_kehadiran && hasTabel(n.tabel_kehadiran))) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfilNominee(n);
                    setReadProfiles(prev => new Set(prev).add(n.id));
                  }}
                  className={`relative z-10 mt-3 w-full py-2 px-3 rounded-xl text-xs font-bold transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 border-none ${
                    terpilih 
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' 
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                  }`}
                >
                  👀 Kenalan Dulu Yuk
                </button>
              )}

              {/* Hover Effect Overlay */}
              <div className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                isHovered && !terpilih ? 'bg-gradient-to-t from-navy-800/5 to-transparent' : ''
              }`} />
            </button>
          );
        })}
        {periode?.is_allow_abstain && (
          <button
            type="button"
            key="abstain"
            onClick={() => setPilihan('abstain')}
            onMouseEnter={() => setHoveredId('abstain')}
            onMouseLeave={() => setHoveredId(null)}
            aria-pressed={pilihan === 'abstain'}
            className={`w-[calc((100%-1rem)/2)] sm:w-[calc((100%-2rem)/3)] group relative overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
              pilihan === 'abstain'
                ? 'border-slate-800 bg-gradient-to-br from-slate-50 to-slate-200 shadow-soft-lg scale-[1.02]'
                : 'border-slate-200 bg-white shadow-soft hover:border-slate-400 hover:shadow-card-hover'
            }`}
          >
            {pilihan === 'abstain' && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800/5">
                <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg animate-bounce-in">
                  <Check className="h-4 w-4" />
                </div>
              </div>
            )}
            <div className={`relative mx-auto mb-4 w-fit transition-all duration-300 ${pilihan === 'abstain' ? 'scale-110' : 'group-hover:scale-105'}`}>
              <img
                src="https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png"
                alt="Abstain"
                className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-white object-cover shadow-lg transition-all duration-300 bg-white grayscale opacity-[.92]"
              />
            </div>
            <p className={`truncate text-sm font-semibold transition-colors duration-200 ${
              pilihan === 'abstain' ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-800'
            }`}>
              Abstain
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Tidak Memilih Siapapun</p>
          </button>
        )}
      </div>

      {/* Submit Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pilihan != null) {
            if (pilihan !== 'abstain') {
              const selectedN = nominee.find((n) => n.id === pilihan);
              const requiresReading = selectedN && (selectedN.dokumen_link || (periode?.is_tabel_kehadiran && hasTabel(selectedN.tabel_kehadiran)));
              if (requiresReading && !readProfiles.has(pilihan)) {
                setWarningNominee(selectedN);
                return;
              }
            }
            setIsConfirmOpen(true);
          }
        }}
        className="space-y-3"
      >
        <button
          type="submit"
          disabled={isSubmitting || pilihan == null}
          className={`w-full py-4 text-base font-semibold transition-all duration-300 rounded-2xl shadow-lg ${
            pilihan == null
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'btn-primary bg-gradient-to-r from-navy-800 to-navy-700 hover:from-navy-700 hover:to-navy-600'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Mengirim Suara...
            </span>
          ) : pilihan == null ? (
            <span className="flex items-center justify-center gap-2">
              <Heart className="h-5 w-5" />
              Pilih salah satu kandidat
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send className="h-5 w-5" />
              {pilihan === 'abstain' ? 'Konfirmasi & Kirim Keputusan Abstain' : `Konfirmasi Pilihan untuk ${nominee.find((n) => n.id === pilihan)?.nama}`}
            </span>
          )}
        </button>

        {pilihan == null && (
          <p className="text-center text-xs text-slate-400">
            Silakan klik salah satu kartu di atas untuk menentukan pilihan Anda.
          </p>
        )}
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          onSubmit(pilihan);
        }}
        title="Kirim Suara Pilihan?"
        message={
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {selectedNominee && (
              <img
                src={selectedNominee.foto_url || (selectedNominee.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${selectedNominee.nip}.jpg` : null)}
                alt={selectedNominee.nama}
                className="h-16 w-16 shrink-0 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedNominee.nama || 'N')}&background=16324a&color=fff&size=64`;
                }}
              />
            )}
            <p className="text-center sm:text-left">
              {pilihan === 'abstain' ? (
                <>Apakah Anda yakin <strong>tidak ingin memilih siapapun (Abstain)</strong> pada periode ini? Suara Anda tetap akan dihitung sebagai partisipasi masuk.</>
              ) : (
                <>Sebelum mengirim suara, pastikan Anda telah meninjau kandidat lainnya. Apakah Anda yakin ingin menetapkan pilihan pada <strong className="text-navy-900">{selectedNominee?.nama}</strong>?</>
              )}
            </p>
          </div>
        }
      />

      <ProfilNomineeModal
        isOpen={Boolean(profilNominee)}
        onClose={() => setProfilNominee(null)}
        nominee={profilNominee}
        isTabelKehadiranEnabled={periode?.is_tabel_kehadiran}
        onVoteClick={() => {
          const n = profilNominee;
          setPilihan(n.id);
          setReadProfiles(prev => new Set(prev).add(n.id));
          setProfilNominee(null);
          setTimeout(() => setIsConfirmOpen(true), 150);
        }}
      />

      <Modal isOpen={Boolean(warningNominee)} onClose={() => setWarningNominee(null)} title="Peringatan" maxWidth="max-w-md">
        <div className="flex flex-col items-center text-center p-4">
          <div className="h-16 w-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-navy-900 mb-2">Mohon Tinjau Profil Terlebih Dahulu</h3>
          <p className="text-slate-600 text-sm mb-6">
            Untuk memberikan penilaian yang objektif, mohon luangkan waktu melihat <strong>detail profil</strong> kandidat {warningNominee?.nama} sebelum mengirim suara.
          </p>
              <button
                type="button"
                onClick={() => {
                  const n = warningNominee;
                  setProfilNominee(n);
                  setReadProfiles(prev => new Set(prev).add(n.id));
                  setWarningNominee(null);
                }}
                className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02]"
              >
                👀 Kenalan Dulu Yuk
              </button>
        </div>
      </Modal>
    </div>
  );
}

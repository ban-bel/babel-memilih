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

  const selectedNominee = nominee.find((n) => n.id === pilihan);

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
            <p className="font-semibold text-slate-800">Pemilihan Kandidat pada {periode?.nama_periode}</p>
            <p className="text-xs text-slate-500">Tentukan pilihan Anda dengan cermat dan berikan suara untuk kandidat terbaik.</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
              className={`group relative overflow-hidden rounded-2xl border-2 p-4 text-center transition-all duration-300 ${
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
              {(n.dokumen_link || hasTabel(n.tabel_kehadiran)) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfilNominee(n);
                    setReadProfiles(prev => new Set(prev).add(n.id));
                  }}
                  className={`relative z-10 mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-colors border ${
                    terpilih 
                      ? 'bg-white/50 border-navy-200 text-navy-700 hover:bg-white' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-navy-600'
                  }`}
                >
                  🔍 Lihat Detail Profil
                </button>
              )}

              {/* Hover Effect Overlay */}
              <div className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${
                isHovered && !terpilih ? 'bg-gradient-to-t from-navy-800/5 to-transparent' : ''
              }`} />
            </button>
          );
        })}
      </div>

      {/* Submit Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pilihan != null) {
            const selectedNominee = nominee.find((n) => n.id === pilihan);
            const requiresReading = selectedNominee && (selectedNominee.dokumen_link || hasTabel(selectedNominee.tabel_kehadiran));
            if (requiresReading && !readProfiles.has(pilihan)) {
              setWarningNominee(selectedNominee);
              return;
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
              Konfirmasi Pilihan untuk {nominee.find((n) => n.id === pilihan)?.nama}
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
              Sebelum mengirim suara, pastikan Anda telah meninjau kandidat lainnya. Apakah Anda yakin ingin menetapkan pilihan pada <strong className="text-navy-900">{selectedNominee?.nama}</strong>?
            </p>
          </div>
        }
      />

      <ProfilNomineeModal
        isOpen={Boolean(profilNominee)}
        onClose={() => setProfilNominee(null)}
        nominee={profilNominee}
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
            onClick={() => {
              const n = warningNominee;
              setWarningNominee(null);
              setProfilNominee(n);
              setReadProfiles(prev => new Set(prev).add(n.id));
            }}
            className="w-full bg-navy-600 text-white font-medium py-3 rounded-xl hover:bg-navy-700 transition"
          >
            Tinjau Profil Kandidat
          </button>
        </div>
      </Modal>
    </div>
  );
}

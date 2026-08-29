import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { Send, Loader2, Trophy, Target, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../../components/common/ConfirmModal';

/**
 * Form Mode 2A — Seleksi & Scoring.
 *
 * Alur:
 * 1. Pilih 1 nominee favorit (radio button style)
 * 2. Beri skor pada setiap kriteria
 * 3. Submit
 *
 * @param {Object} props
 * @param {Object} props.akses - Data akses token (periode, penilai info)
 * @param {Array} props.nominee - Array nominee [{id, nama, unit_kerja, foto_url, nip}]
 * @param {Array} props.kriteria - Array kriteria [{id, nama_kriteria, deskripsi, skor_min, skor_max}]
 * @param {Array} props.votesTersimpan - Array votes yang sudah ada [{nominee_id, kriteria_id, skor}]
 * @param {Function} props.onSubmit - Callback submit(payload)
 * @param {boolean} props.isSubmitting - Loading state
 */
export default function FormMode2A({
  akses,
  nominee,
  kriteria,
  votesTersimpan,
  onSubmit,
  isSubmitting,
}) {
  const [selectedNominee, setSelectedNominee] = useState(null);
  // scores[kriteriaId] = score value
  const [scores, setScores] = useState({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Load saved votes for resume
  useEffect(() => {
    if (votesTersimpan && votesTersimpan.length > 0) {
      votesTersimpan.forEach((vote) => {
        if (vote.kriteria_id) {
          setScores((prev) => ({ ...prev, [vote.kriteria_id]: vote.skor }));
          setSelectedNominee(vote.nominee_id);
        }
      });
    }
  }, [votesTersimpan]);

  // Initialize scores with middle value when nominee selected
  useEffect(() => {
    if (selectedNominee && Object.keys(scores).length === 0 && kriteria.length > 0) {
      const initialScores = {};
      kriteria.forEach((k) => {
        const middle = Math.round((k.skor_min + k.skor_max) / 2);
        initialScores[k.id] = middle;
      });
      setScores(initialScores);
    }
  }, [selectedNominee, kriteria, scores]);

  const handleNomineeSelect = (nomineeId) => {
    setSelectedNominee(nomineeId);
    // Initialize scores if not exists
    if (Object.keys(scores).length === 0 && kriteria.length > 0) {
      const initialScores = {};
      kriteria.forEach((k) => {
        const middle = Math.round((k.skor_min + k.skor_max) / 2);
        initialScores[k.id] = middle;
      });
      setScores(initialScores);
    }
  };

  const handleScoreChange = (kriteriaId, value) => {
    setScores((prev) => ({ ...prev, [kriteriaId]: value }));
  };

  // Check if all criteria have been scored
  const allCriteriaScored = kriteria.every((k) => scores[k.id] != null);
  const isValid = selectedNominee && allCriteriaScored;
  const scoredCount = kriteria.filter((k) => scores[k.id] != null).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Pilih nominee dan berikan skor untuk semua kriteria');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleLanjutkanKirim = () => {
    // Build payload: one entry per kriteria
    const payload = kriteria.map((k) => ({
      nominee_id: selectedNominee,
      kriteria_id: k.id,
      skor: scores[k.id],
    }));
    onSubmit(payload);
  };

  const unblockedNominees = nominee.filter(n => !n.isBlocked);
  if (unblockedNominees.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <Trophy className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-500">Belum ada nominee pada periode ini.</p>
      </div>
    );
  }

  if (kriteria.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Target className="h-8 w-8 text-amber-600" />
        </div>
        <p className="font-medium text-amber-800">Kriteria belum ditentukan</p>
        <p className="mt-2 text-sm text-amber-600">
          Hubungi admin untuk menambahkan kriteria penilaian.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-700 to-navy-800 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Seleksi & Scoring</h2>
              <p className="text-sm text-white/80">
                {kriteria.length} Kriteria Penilaian
              </p>
            </div>
          </div>
          {allCriteriaScored && selectedNominee && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-medium text-emerald-200">Lengkap</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Pilih Nominee */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
              1
            </span>
            Pilih Kandidat Favorit
          </h3>

          <div className="grid gap-3">
            {unblockedNominees.map((n) => {
              const isSelected = selectedNominee === n.id;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNomineeSelect(n.id)}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-gold-500 bg-gold-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Radio indicator */}
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? 'border-gold-500 bg-gold-500'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Avatar */}
                    <img
                      src={
                        n.foto_url ||
                        (n.nip
                          ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg`
                          : null)
                      }
                      alt={n.nama}
                      className="h-12 w-12 shrink-0 rounded-full border-2 border-slate-200 object-cover shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          n.nama
                        )}&background=16324a&color=fff&size=128`;
                      }}
                    />

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{n.nama}</p>
                      <p className="truncate text-sm text-slate-500">{n.unit_kerja}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Beri Skor untuk Setiap Kriteria */}
        {selectedNominee && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft animate-fade-in">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                2
              </span>
              Berikan Skor untuk Setiap Kriteria
              <span className="ml-auto text-sm font-normal text-slate-500">
                {scoredCount}/{kriteria.length} kriteria
              </span>
            </h3>

            <div className="space-y-4">
              {kriteria.map((k, kIdx) => {
                const currentScore = scores[k.id] || Math.round((k.skor_min + k.skor_max) / 2);
                const percent = ((currentScore - k.skor_min) / (k.skor_max - k.skor_min)) * 100;
                const scoreId = `kriteria-${k.id}`;

                return (
                  <div
                    key={k.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all"
                  >
                    {/* Kriteria Header */}
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy-100 text-xs font-bold text-navy-700">
                        {kIdx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{k.nama_kriteria}</p>
                        {k.deskripsi && (
                          <div className="text-xs text-slate-500 prose prose-sm prose-slate max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                            <ReactMarkdown>{k.deskripsi}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-bold text-gold-700">
                        {k.skor_min}-{k.skor_max}
                      </span>
                    </div>

                    {/* Score Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleScoreChange(k.id, Math.max(k.skor_min, currentScore - 1))
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
                      >
                        -
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editingId === scoreId ? editingValue : currentScore}
                        onFocus={() => {
                          setEditingId(scoreId);
                          setEditingValue(String(currentScore));
                        }}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setEditingValue(raw);
                        }}
                        onBlur={() => {
                          const raw = editingValue.replace(/[^0-9]/g, '');
                          let val = parseInt(raw, 10);
                          if (isNaN(val)) val = currentScore;
                          if (val > k.skor_max) val = k.skor_max;
                          if (val < k.skor_min) val = k.skor_min;
                          handleScoreChange(k.id, val);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur();
                        }}
                        className="w-20 shrink-0 rounded-xl border-2 border-navy-200 bg-white py-2 text-center text-2xl font-black text-navy-900 shadow-inner transition-all focus:border-gold-400 focus:outline-none focus:ring-4 focus:ring-gold-400/20"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleScoreChange(k.id, Math.min(k.skor_max, currentScore + 1))
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-xl font-bold text-navy-700 transition-colors hover:bg-navy-200 active:scale-95"
                      >
                        +
                      </button>

                      {/* Slider */}
                      <div className="relative flex-1 px-2">
                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                          <span>{k.skor_min}</span>
                          <span>{k.skor_max}</span>
                        </div>
                        <div className="relative">
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-200"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <input
                            type="range"
                            min={k.skor_min}
                            max={k.skor_max}
                            value={currentScore}
                            onChange={(e) => handleScoreChange(k.id, Number(e.target.value))}
                            className="absolute inset-0 w-full cursor-pointer opacity-0"
                          />
                          <div
                            className="pointer-events-none absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-gold-500 to-gold-600 shadow-lg transition-all duration-100"
                            style={{ left: `calc(${percent}% - 10px)` }}
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className={`w-full rounded-xl py-4 text-base font-semibold shadow-lg transition-all ${
            isValid && !isSubmitting
              ? 'bg-gradient-to-r from-navy-700 to-navy-800 text-white hover:from-navy-800 hover:to-navy-900'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Mengirim...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Send className="h-5 w-5" />
              Kirim Penilaian ({scoredCount}/{kriteria.length})
            </span>
          )}
        </button>

        {!isValid && selectedNominee && (
          <p className="text-center text-sm text-slate-400">
            Berikan skor untuk semua {kriteria.length} kriteria untuk melanjutkan
          </p>
        )}
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleLanjutkanKirim}
        title="Kirim Penilaian?"
        message={`Anda akan memberikan skor untuk ${kriteria.length} kriteria kepada nominee yang dipilih. Penilaian tidak dapat diubah kembali.`}
      />
    </div>
  );
}

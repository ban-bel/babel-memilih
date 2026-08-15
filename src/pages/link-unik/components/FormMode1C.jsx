/**
 * @fileoverview Form voting untuk MODE_1B (Hybrid) - Voting Per Kategori.
 *
 * User wajib vote di SEMUA kategori sebelum submit.
 * Menggunakan step-by-step wizard.
 *
 * @module pages/link-unik/components/FormMode1C
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import { submitAllVotesMode1C } from '../../../services/votingService';

/**
 * Komponen FormMode1C.
 *
 * Step-by-step voting per kategori untuk MODE_1B (Hybrid).
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {Object[]} props.nominee - Array data nominee
 * @param {Object[]} props.kategori - Array kategori voting
 * @param {Object[]} props.votesTersimpan - Vote yang sudah tersimpan (untuk resume)
 * @param {Function} props.onSubmit - Callback saat submit berhasil
 * @param {boolean} props.isSubmitting - Loading state
 * @param {string} props.errorMessage - Pesan error
 */
export default function FormMode1C({
  token,
  nominee,
  kategori,
  votesTersimpan = [],
  periode,
  onSubmit,
  isSubmitting,
  errorMessage,
}) {
  const [votes, setVotes] = useState({}); // { [kategoriId]: nomineeId }
  const [langkahSaatIni, setLangkahSaatIni] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Inisialisasi votes dari data tersimpan dan localStorage
  useEffect(() => {
    let baru = {};
    if (votesTersimpan.length > 0) {
      votesTersimpan.forEach((v) => {
        if (v.nominee_id && v.nominee_id > 0) {
          baru[v.kategori_id] = v.nominee_id;
        }
      });
    }
    
    if (token) {
      try {
        const saved = localStorage.getItem(`draft_mode1c_${token}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.votes) {
            baru = { ...baru, ...parsed.votes };
            setHasDraft(true);
          }
        }
      } catch(e) {
        console.warn("Failed to read draft", e);
      }
    }
    
    setVotes(baru);
  }, [votesTersimpan, token]);

  useEffect(() => {
    if (!token) return;
    if (hasDraft || Object.keys(votes).length > 0) {
      localStorage.setItem(`draft_mode1c_${token}`, JSON.stringify({ votes }));
    }
  }, [votes, hasDraft, token]);

  const totalKategori = kategori.length;
  const kategoriSaatIni = kategori[langkahSaatIni];
  const voteSaatIni = votes[kategoriSaatIni?.id];

  // Cek apakah semua kategori sudah divote
  const voteSelesai = Object.keys(votes).length === totalKategori;

  // Progress
  const voteCount = Object.keys(votes).filter((k) => votes[k]).length;

  function handlePilihNominee(nomineeId) {
    setVotes((prev) => ({
      ...prev,
      [kategoriSaatIni.id]: nomineeId,
    }));
    setHasDraft(true);
    toast.success('Pilihan tersimpan', { duration: 1000 });
  }

  async function handleSubmit() {
    if (!voteSelesai) {
      toast.error('Wajib vote di semua kategori!');
      return;
    }

    const payload = Object.entries(votes).map(([kategoriId, nomineeId]) => ({
      kategori_id: Number(kategoriId),
      nominee_id: nomineeId,
    }));

    onSubmit(payload);
  }

  if (!kategori || kategori.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Tidak ada kategori voting untuk periode ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              Progress Voting
            </span>
            {hasDraft && voteCount < totalKategori && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1">
                <Save className="h-3 w-3" />
                DRAF TERSIMPAN
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-navy-800">
            {voteCount} / {totalKategori}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${(voteCount / totalKategori) * 100}%` }}
          />
        </div>

        {/* Tab Kategori */}
        <div className="mt-3 flex flex-wrap gap-2">
          {kategori.map((k, idx) => {
            const isActive = idx === langkahSaatIni;
            const isDone = Boolean(votes[k.id]);

            return (
              <button
                key={k.id}
                type="button"
                onClick={() => setLangkahSaatIni(idx)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-navy-800 text-white'
                    : isDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <span className="flex h-3 w-3 items-center justify-center rounded-full bg-slate-300 text-[8px]">
                    {idx + 1}
                  </span>
                )}
                <span className="max-w-[100px] truncate">{k.nama_kategori}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kategori Saat Ini */}
      {kategoriSaatIni && (
        <div className="rounded-xl border border-navy-200 bg-white p-5 animate-fade-in">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">
                {langkahSaatIni + 1}
              </span>
              <h3 className="text-lg font-bold text-navy-900">
                {kategoriSaatIni.nama_kategori}
              </h3>
            </div>
            {kategoriSaatIni.deskripsi && (
              <p className="text-sm text-slate-500 ml-8">
                {kategoriSaatIni.deskripsi}
              </p>
            )}
          </div>

          {/* Grid Nominee */}
          <div className="flex flex-wrap justify-center gap-3">
            {nominee.map((n) => {
              const isSelected = voteSaatIni === n.id;

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handlePilihNominee(n.id)}
                  className={`w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)] relative flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-navy-300 hover:bg-navy-50'
                  }`}
                >
                  {/* Avatar */}
                  <img
                    src={n.foto_url || (n.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg` : null)}
                    alt={n.nama}
                    className={`h-16 w-16 rounded-full object-cover border-2 mb-2 ${
                      isSelected ? 'border-emerald-400' : 'border-slate-200'
                    }`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.nama || 'P')}&background=16324a&color=fff&size=128`;
                    }}
                  />

                  {/* Nama */}
                  <p className={`text-center font-semibold text-sm ${
                    isSelected ? 'text-emerald-700' : 'text-slate-800'
                  }`}>
                    {n.nama}
                  </p>

                  {/* Unit Kerja */}
                  <p className="text-center text-xs text-slate-400 mt-0.5">
                    {n.unit_kerja}
                  </p>

                  {/* Badge Selected */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </button>
              );
            })}
            
            {/* Tombol Abstain */}
            {periode?.is_allow_abstain && (
              <button
                key="abstain"
                type="button"
                onClick={() => handlePilihNominee('abstain')}
                className={`w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)] relative flex flex-col items-center rounded-xl border-2 p-4 transition-all ${
                  voteSaatIni === 'abstain'
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-navy-300 hover:bg-navy-50'
                }`}
              >
                <img
                  src="https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png"
                  alt="Abstain"
                  className={`h-16 w-16 rounded-full object-cover border-2 mb-2 grayscale opacity-[.92] ${
                    voteSaatIni === 'abstain' ? 'border-emerald-400' : 'border-slate-200'
                  }`}
                />
                <p className={`text-center font-semibold text-sm ${
                  voteSaatIni === 'abstain' ? 'text-emerald-700' : 'text-slate-800'
                }`}>
                  {voteSaatIni === 'abstain' ? 'Konfirmasi & Kirim Keputusan Abstain' : 'Abstain / Kotak Kosong'}
                </p>
                <p className="text-center text-xs text-slate-400 mt-0.5">
                  Suara Tidak Sah
                </p>
                {voteSaatIni === 'abstain' && (
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </button>
            )}
          </div>

          {/* Vote Indicator */}
          {voteSaatIni && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-sm text-emerald-700">
                ✓ Pilihan tersimpan untuk kategori ini
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLangkahSaatIni((s) => Math.max(0, s - 1))}
          disabled={langkahSaatIni === 0}
          className="btn-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {langkahSaatIni < totalKategori - 1 ? (
          <button
            type="button"
            onClick={() => setLangkahSaatIni((s) => s + 1)}
            className="btn-primary"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!voteSelesai || isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Submit Voting
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Warning if not all voted */}
      {!voteSelesai && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          ⚠️ Anda harus vote di <strong>semua {totalKategori} kategori</strong> sebelum bisa submit.
          {voteCount > 0 && ` (${voteCount}/${totalKategori} sudah vote)`}
        </div>
      )}
    </div>
  );
}

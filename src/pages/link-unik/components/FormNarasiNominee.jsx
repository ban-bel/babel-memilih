/**
 * @fileoverview Form jawaban narasi untuk nominee Mode 1A.
 *
 * Mode 1A adalah pertanyaan narasi - nominee mengisi jawaban teks untuk
 * setiap pertanyaan. TIDAK ada upload file di Mode 1A.
 *
 * Fitur:
 * - Auto-save saat berhenti mengetik (debounce 900ms)
 * - Indikator "Terisi/Belum diisi"
 * - Status penyimpanan
 *
 * @module pages/link-unik/components/FormNarasiNominee
 */

import { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle2, Loader2, Clock } from 'lucide-react';

/**
 * Form jawaban narasi untuk satu pertanyaan.
 *
 * @component
 * @param {Object} props - Props komponen
 * @param {Object} props.pertanyaan - Data pertanyaan
 * @param {number} props.pertanyaan.id - ID pertanyaan
 * @param {number} props.pertanyaan.urutan - Nomor urut
 * @param {string} props.pertanyaan.teks_pertanyaan - Teks pertanyaan
 * @param {Object} props.jawabanTersimpan - Jawaban yang sudah tersimpan
 * @param {string} [props.jawabanTersimpan.teks_jawaban] - Teks jawaban tersimpan
 * @param {Function} props.onSimpan - Handler untuk menyimpan teks jawaban
 */
export default function FormNarasiNominee({ pertanyaan, jawabanTersimpan, onSimpan }) {
  const [teks, setTeks] = useState(jawabanTersimpan?.teks_jawaban ?? '');
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const hasChangesRef = useRef(false);

  // Sinkronisasi dengan jawaban tersimpan dari server
  useEffect(() => {
    setTeks(jawabanTersimpan?.teks_jawaban ?? '');
    hasChangesRef.current = false;
    setStatus('idle');
  }, [jawabanTersimpan?.teks_jawaban]);

  // Auto-save dengan debounce 900ms
  useEffect(() => {
    if (!hasChangesRef.current) return;

    // Clear timeout sebelumnya
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout baru
    timeoutRef.current = setTimeout(async () => {
      if (!teks.trim() && !jawabanTersimpan?.teks_jawaban) {
        // Kosong dan sebelumnya juga kosong, tidak perlu save
        setStatus('idle');
        return;
      }

      setStatus('saving');
      setError(null);

      try {
        await onSimpan(teks);
        setStatus('saved');
        hasChangesRef.current = false;

        // Reset status setelah 2 detik
        setTimeout(() => {
          setStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }, 900);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [teks, onSimpan, jawabanTersimpan?.teks_jawaban]);

  /**
   * Handle perubahan teks.
   */
  function handleChange(e) {
    setTeks(e.target.value);
    hasChangesRef.current = true;
    setStatus('idle');
  }

  // Apakah sudah terisi
  const sudahTerisi = Boolean(teks.trim() || jawabanTersimpan?.teks_jawaban);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:shadow-soft-lg">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Nomor Urut */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-sm font-bold text-navy-800">
          {pertanyaan.urutan}
        </div>

        {/* Teks Pertanyaan */}
        <p className="flex-1 text-sm font-medium leading-relaxed text-slate-800">
          {pertanyaan.teks_pertanyaan}
        </p>

        {/* Indikator Status */}
        <div className="shrink-0">
          {sudahTerisi ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Terisi
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <Clock className="h-3 w-3" />
              Belum
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Textarea */}
      <textarea
        rows={4}
        value={teks}
        onChange={handleChange}
        placeholder="Tuliskan jawaban Anda di sini..."
        className="input resize-none"
      />

      {/* Status Saving */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {status === 'saving' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Menyimpan...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600">Tersimpan</span>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="text-red-500">Gagal menyimpan</span>
          </>
        )}
        {status === 'idle' && sudahTerisi && (
          <span className="text-slate-400">Tersimpan otomatis</span>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Trophy, Lock, Loader2, Edit2, Check, Crown } from 'lucide-react';

/**
 * Form penguncian keputusan pemenang resmi — dipakai di Tab Ketua Juri
 * (JuriPage, via token) dan Dashboard Kakan (via login Admin). Diekstrak
 * terpisah dari tabel rekap supaya masing-masing pemanggil bebas menampilkan
 * tabelnya sendiri tanpa duplikasi.
 *
 * @param {{nominee_id:number,nama_nominee:string,peringkat:number,skor_akhir_juri?:number}[]} opsiNominee
 * @param {{pemenang_id:number, pemenang:{nama:string}, catatan_pertimbangan:string}|null} keputusanSaatIni
 * @param {(pemenangId:number, catatan:string) => void} onKunci
 * @param {boolean} isSubmitting
 */
export default function FormKunciPemenang({ opsiNominee, keputusanSaatIni, onKunci, isSubmitting, disabled = false, disabledMessage = '' }) {
  const [editMode, setEditMode] = useState(!keputusanSaatIni);
  const [pemenangId, setPemenangId] = useState(keputusanSaatIni?.pemenang_id ?? null);
  const [catatan, setCatatan] = useState(keputusanSaatIni?.catatan_pertimbangan ?? '');

  const selectedWinner = opsiNominee.find((n) => n.nominee_id === pemenangId);

  return (
    <div className="overflow-hidden rounded-2xl border border-gold-200/50 bg-white shadow-soft-lg">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-gold-500/10 via-gold-500/5 to-gold-500/10 border-b border-gold-200/30 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-100/20 to-transparent" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-white shadow-lg shadow-gold-500/25">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">Kunci Keputusan Pemenang</h2>
            <p className="text-xs text-slate-500">Pilih dan konfirmasi pemenang resmi periode ini</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {disabled ? (
          <div className="rounded-xl bg-red-50 p-4 border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <Lock className="h-5 w-5" />
              <p className="font-bold">Penguncian Pemenang Dinonaktifkan</p>
            </div>
            <p className="text-sm text-red-700">{disabledMessage || 'Semua penilai/juri harus menyelesaikan penilaian terlebih dahulu.'}</p>
          </div>
        ) : !editMode && keputusanSaatIni ? (
          <div className="space-y-4">
            {/* Winner Display */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-50/50 to-emerald-50/30 border border-emerald-200/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg">
                  <Crown className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Pemenang Resmi</p>
                  <p className="font-display text-lg font-bold text-slate-900">{keputusanSaatIni.pemenang?.nama}</p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-white/60 p-3 text-sm text-slate-600 italic">
                "{keputusanSaatIni.catatan_pertimbangan}"
              </div>
            </div>

            <div className="rounded-xl border border-gold-200 bg-gold-50/50 p-3 text-center">
              <p className="text-xs font-semibold text-gold-700 flex items-center justify-center gap-2">
                <Lock className="h-4 w-4" />
                Keputusan ini bersifat final dan tidak dapat diubah lagi.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onKunci(pemenangId, catatan);
            }}
            className="space-y-4"
          >
            {/* Winner Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Crown className="h-4 w-4 text-gold-500" />
                Nominee Pemenang
              </label>
              <select
                value={pemenangId ?? ''}
                onChange={(e) => setPemenangId(Number(e.target.value))}
                className="input"
              >
                <option value="" disabled>
                  Pilih nominee...
                </option>
                {opsiNominee.map((r, idx) => (
                  <option key={r.nominee_id} value={r.nominee_id}>
                    {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}#
                    {r.peringkat} — {r.nama_nominee}
                    {r.skor_akhir_juri != null ? ` (${Number(r.skor_akhir_juri).toFixed(2)})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Consideration Notes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Edit2 className="h-4 w-4 text-slate-400" />
                Catatan Pertimbangan
              </label>
              <textarea
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tuliskan dasar pertimbangan keputusan akhir..."
                className="input resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !pemenangId || !catatan.trim()}
              className="btn-gold w-full py-3"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="h-5 w-5" />
                  Kunci Pemenang
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

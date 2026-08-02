import { Medal, Users } from 'lucide-react';
import FormKunciPemenang from '../../../components/common/FormKunciPemenang';

export default function RekapKetuaJuri({ rekap, jumlahJuriSelesai, totalJuri, keputusanSaatIni, onKunci, isSubmitting }) {
  const semuaJuriSelesai = totalJuri > 0 && jumlahJuriSelesai >= totalJuri;

  return (
    <div className="space-y-5">
      {/* Progress Banner */}
      <div className="rounded-2xl border border-gold-200/50 bg-gradient-to-r from-gold-50/50 to-gold-50/30 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100">
            <Users className="h-5 w-5 text-gold-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-800">
              <span className="text-lg font-bold text-gold-600">{jumlahJuriSelesai}</span>
              <span className="text-slate-500"> dari </span>
              <span className="text-lg font-bold text-navy-800">{totalJuri}</span>
              <span className="text-slate-500"> juri sudah mengirim</span>
            </p>
            {!semuaJuriSelesai && (
              <p className="text-xs text-slate-500 mt-1">Rekap akan terus berubah selagi juri lain masih menilai</p>
            )}
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500"
            style={{ width: `${totalJuri > 0 ? (jumlahJuriSelesai / totalJuri) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Peringkat</th>
              <th className="px-4 py-3">Nominee</th>
              <th className="px-4 py-3 text-right">Skor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rekap.map((r) => (
              <tr key={r.nominee_id} className={r.peringkat === 1 ? 'bg-gold-50/50' : ''}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    {r.peringkat === 1 && <Medal className="h-5 w-5 text-gold-500" />}
                    <span className={`text-lg ${r.peringkat === 1 ? 'text-gold-600' : 'text-navy-800'}`}>#{r.peringkat}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={r.foto_url || (r.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${r.nip}.jpg` : null)}
                      alt={r.nama_nominee}
                      className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.nama_nominee)}&background=16324a&color=fff&size=64`;
                      }}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{r.nama_nominee}</p>
                      <p className="text-xs text-slate-500">Juri: {r.jumlah_juri_selesai}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-lg font-bold ${r.peringkat === 1 ? 'text-gold-600' : 'text-navy-800'}`}>
                    {Number(r.skor_akhir_juri ?? 0).toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormKunciPemenang
        opsiNominee={rekap}
        keputusanSaatIni={keputusanSaatIni}
        onKunci={onKunci}
        isSubmitting={isSubmitting}
        disabled={!semuaJuriSelesai}
        disabledMessage={`Masih ada ${totalJuri - jumlahJuriSelesai} juri yang belum menyelesaikan penilaian. (${jumlahJuriSelesai}/${totalJuri} selesai)`}
      />

      {!semuaJuriSelesai && (
        <div className="rounded-xl border border-gold-200 bg-gold-50/50 p-3 text-center">
          <p className="text-xs text-gold-700">Belum semua juri selesai — Anda harus menunggu semua juri selesai untuk bisa mengunci keputusan.</p>
        </div>
      )}
    </div>
  );
}

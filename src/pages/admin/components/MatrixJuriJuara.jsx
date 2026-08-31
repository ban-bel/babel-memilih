import React, { useMemo } from "react";
import { LayoutGrid, Users } from "lucide-react";

export default function MatrixJuriJuara({ detailJuri, nominees, loading, daftarJuri = [] }) {
  const data = useMemo(() => {
    if (!detailJuri || !nominees) return null;

    const juriMap = {};
    detailJuri.forEach((row) => {
      if (!juriMap[row.juri_id]) {
        juriMap[row.juri_id] = {
          id: row.juri_id,
          nama: row.juri?.nama || "Juri",
          scores: {},
        };
      }
      const juri = juriMap[row.juri_id];
      if (!juri.scores[row.nominee_id]) juri.scores[row.nominee_id] = 0;
      juri.scores[row.nominee_id] += row.skor * ((row.kategori?.bobot_persen || 0) / 100);
    });

    const listJuri = Object.values(juriMap);

    listJuri.forEach((juri) => {
      const arr = Object.entries(juri.scores)
        .map(([nominee_id, total_skor]) => {
          const nom = nominees.find((n) => String(n.nominee_id) === String(nominee_id));
          return {
            nominee_id,
            nama: nom ? nom.nama_nominee || nom.nama : "?",
            foto: nom?.foto_url,
            nip: nom?.nip,
            unit_kerja: nom?.unit_kerja,
            total_skor,
          };
        })
        .sort((a, b) => b.total_skor - a.total_skor);

      let currentRank = 1;
      for (let i = 0; i < arr.length; i++) {
        if (i > 0 && arr[i].total_skor < arr[i - 1].total_skor) currentRank++;
        arr[i].rank = currentRank;
      }
      juri.ranking = arr;
    });

    return { listJuri, nominees };
  }, [detailJuri, nominees]);

  if (loading || !data || data.listJuri.length === 0) return null;

  const getBlockStatus = (juri, nom) => {
    if (juri.scores[nom.nominee_id] !== undefined) return null;
    const jRule = daftarJuri.find((dj) => String(dj.pegawai?.id) === String(juri.id));
    if (!jRule) return "belum";
    if ((jRule.blocked_nominee_ids || []).includes(nom.nominee_id)) return "manual";
    if (
      jRule.is_can_vote_own_region === false &&
      (jRule.pegawai?.unit_kerja === nom.unit_kerja ||
        jRule.pegawai?.wilayah?.nama_wilayah === nom.unit_kerja)
    ) return "wilayah";
    return "belum";
  };

  const MEDAL_BADGE = {
    1: "bg-amber-100 text-amber-700 border-amber-200",
    2: "bg-slate-100 text-slate-600 border-slate-200",
    3: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const MEDAL_LABEL = { 1: "1ST", 2: "2ND", 3: "3RD" };

  return (
    <div className="space-y-8 mb-8 print:hidden">
      {/* === 1. Matriks === */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-navy-50 rounded-xl">
              <LayoutGrid className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">Matriks Kandidat vs Juri</h3>
              <p className="text-xs text-slate-500">Skor tertimbang masing-masing juri terhadap setiap kandidat</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[10px] bg-slate-50 text-slate-300 border-slate-100">-</span>
              Belum Dinilai
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[10px] bg-slate-100 text-slate-400 border-slate-200 opacity-60">&#x1F6AB;</span>
              Blokir Wilayah
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[10px] bg-rose-50 text-rose-400 border-rose-200">&#x274C;</span>
              Blokir Manual
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 border-r border-slate-200 z-20 w-52 min-w-[200px] font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Juri \ Kandidat
                </th>
                {data.nominees.map((nom) => (
                  <th key={nom.nominee_id} className="px-3 py-3 text-center min-w-[110px] font-semibold text-navy-700 text-xs">
                    {nom.nama_nominee || nom.nama || "-"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.listJuri.map((juri, idx) => (
                <tr key={juri.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="px-4 py-3 sticky left-0 bg-inherit border-r border-slate-100 z-10 font-medium text-slate-800 text-sm whitespace-nowrap">
                    {juri.nama}
                  </td>
                  {data.nominees.map((nom) => {
                    const score = juri.scores[nom.nominee_id];
                    const blockStatus = getBlockStatus(juri, nom);

                    if (score !== undefined) {
                      return (
                        <td key={nom.nominee_id} className="px-3 py-3 text-center">
                          <span className="font-bold text-navy-800">{score.toFixed(2)}</span>
                        </td>
                      );
                    }
                    if (blockStatus === "manual") return (
                      <td key={nom.nominee_id} className="px-3 py-3 text-center">
                        <div title="Blokir Manual" className="w-8 h-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-400 flex items-center justify-center text-sm mx-auto">&#x274C;</div>
                      </td>
                    );
                    if (blockStatus === "wilayah") return (
                      <td key={nom.nominee_id} className="px-3 py-3 text-center">
                        <div title="Blokir Wilayah" className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 opacity-60 flex items-center justify-center text-sm mx-auto">&#x1F6AB;</div>
                      </td>
                    );
                    return (
                      <td key={nom.nominee_id} className="px-3 py-3 text-center">
                        <div title="Belum Dinilai" className="w-8 h-8 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 flex items-center justify-center text-sm mx-auto">-</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Footer rata-rata */}
              <tr className="bg-emerald-50/60 border-t-2 border-emerald-100 font-bold">
                <td className="px-4 py-3 sticky left-0 bg-emerald-50/60 border-r border-emerald-100 z-10 text-emerald-800 text-sm">
                  Rata-Rata Akhir
                </td>
                {data.nominees.map((nom) => (
                  <td key={"avg-" + nom.nominee_id} className="px-3 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm border border-emerald-200">
                      {Number(nom.skor_akhir_juri || 0).toFixed(2)}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* === 2. Preferensi Juara Tiap Juri === */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy-900">Preferensi Juara Tiap Juri</h3>
            <p className="text-xs text-slate-500">Peringkat kandidat menurut perspektif masing-masing juri</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.listJuri.map((juri) => (
              <div key={juri.id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                <div className="px-4 py-3 bg-white border-b border-slate-100">
                  <p className="font-bold text-navy-800 text-sm truncate" title={juri.nama}>{juri.nama}</p>
                </div>
                <div className="p-3 space-y-2">
                  {juri.ranking.filter((r) => r.rank <= 3).map((rank) => (
                    <div key={rank.nominee_id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-slate-100 shadow-sm">
                      <span className={"text-[10px] px-2 py-1 rounded font-bold border flex-shrink-0 " + (MEDAL_BADGE[rank.rank] || "bg-slate-100 text-slate-500 border-slate-200")}>
                        {MEDAL_LABEL[rank.rank] || rank.rank + "TH"}
                      </span>
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 flex-shrink-0 border border-slate-100">
                        <img
                          src={rank.foto || (rank.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${rank.nip}.jpg` : `https://ui-avatars.com/api/?name=${encodeURIComponent(rank.nama)}&background=16324a&color=fff`)}
                          alt={rank.nama}
                          onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rank.nama)}&background=16324a&color=fff`; }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="font-medium text-sm text-slate-800 truncate flex-1" title={rank.nama}>{rank.nama}</p>
                      <span className="text-xs font-bold text-navy-600 flex-shrink-0">{rank.total_skor.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

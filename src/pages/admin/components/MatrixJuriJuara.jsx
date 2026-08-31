import React, { useMemo } from 'react';
import { Ban, UserX, Clock } from 'lucide-react';

export default function MatrixJuriJuara({ detailJuri, nominees, loading, daftarJuri = [] }) {
  const data = useMemo(() => {
    if (!detailJuri || !nominees) return null;

    // 1. Kumpulkan semua skor per Juri -> per Nominee
    // juriMap[juri_id] = { juri_id, nama_juri, scores: { [nominee_id]: totalSkor } }
    const juriMap = {};

    detailJuri.forEach((row) => {
      if (!juriMap[row.juri_id]) {
        juriMap[row.juri_id] = {
          id: row.juri_id,
          nama: row.juri?.nama || 'Juri',
          scores: {},
          catatanList: []
        };
      }
      const juri = juriMap[row.juri_id];
      if (!juri.scores[row.nominee_id]) {
        juri.scores[row.nominee_id] = 0;
      }
      
      const weightedScore = row.skor * ((row.kategori?.bobot_persen || 0) / 100);
      juri.scores[row.nominee_id] += weightedScore;
    });

    const listJuri = Object.values(juriMap);

    // 2. Hitung ranking per juri
    listJuri.forEach(juri => {
      const arr = Object.entries(juri.scores).map(([nominee_id, total_skor]) => {
        const nom = nominees.find(n => String(n.nominee_id) === String(nominee_id));
        return {
          nominee_id,
          nama: nom ? (nom.nama_nominee || nom.nama) : '?',
          foto: nom ? nom.foto_url : null,
          nip: nom ? nom.nip : null,
          total_skor
        };
      });
      // sort desc
      arr.sort((a, b) => b.total_skor - a.total_skor);
      
      // Hitung rank unik (Dense Ranking 1223)
      let currentRank = 1;
      for (let i = 0; i < arr.length; i++) {
        if (i > 0 && arr[i].total_skor < arr[i-1].total_skor) {
          currentRank++;
        }
        arr[i].rank = currentRank;
      }
      
      juri.ranking = arr;
    });

    return {
      listJuri,
      nominees
    };
  }, [detailJuri, nominees]);

  if (loading) return null;
  if (!data || data.listJuri.length === 0) return null;

  return (
    <div className="mt-8 space-y-8 animate-fade-in-up">
      {/* 1. Matriks Kandidat vs Juri */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-bold text-navy-900">Matriks Kandidat vs Juri</h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[10px] bg-slate-50 text-slate-300 border-slate-100">-</span>
              <span>Belum Dinilai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[10px] bg-slate-100 text-slate-400 border-slate-200 opacity-60">🚫</span>
              <span>Blokir (Wilayah)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded border flex items-center justify-center text-[10px] bg-rose-50 text-rose-600 border-rose-200 shadow-inner-soft">❌</span>
              <span>Blokir (Manual)</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-100 text-xs uppercase text-slate-700">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-slate-100 border-r border-slate-200 z-10 w-64 min-w-[200px]">
                  Juri \ Kandidat
                </th>
                {data.nominees.map(nom => (
                  <th key={nom.nominee_id} className="px-4 py-3 text-center border-b border-slate-200 min-w-[120px]">
                    <span className="font-bold text-navy-700 whitespace-nowrap">
                      {nom.nama_nominee || nom.nama || '-'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.listJuri.map((juri, idx) => (
                <tr key={juri.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-4 py-3 sticky left-0 bg-inherit border-r border-slate-100 z-10 font-medium text-slate-800">
                    {juri.nama}
                  </td>
                  {data.nominees.map(nom => {
                    const score = juri.scores[nom.nominee_id];
                    
                    let isBlocked = false;
                    let blockReason = 'Belum Dinilai';
                    const jRule = daftarJuri.find(dj => String(dj.pegawai?.id) === String(juri.id));
                    
                    if (jRule && score === undefined) {
                      if ((jRule.blocked_nominee_ids || []).includes(nom.nominee_id)) {
                        isBlocked = true;
                        blockReason = 'Blokir (Manual)';
                      } else if (jRule.is_can_vote_own_region === false && (jRule.pegawai?.unit_kerja === nom.unit_kerja || jRule.pegawai?.wilayah?.nama_wilayah === nom.unit_kerja || jRule.pegawai?.wilayah?.nama_unit_kerja === nom.unit_kerja)) {
                        isBlocked = true;
                        blockReason = 'Blokir (Konflik Wilayah)';
                      }
                    }

                    let statusIcon = '-';
                    let statusClass = 'bg-slate-50 text-slate-300 border-slate-100';
                    
                    if (isBlocked) {
                      if (blockReason === 'Blokir (Manual)') {
                        statusIcon = '❌';
                        statusClass = 'bg-rose-50 text-rose-600 border-rose-200 shadow-inner-soft';
                      } else {
                        statusIcon = '🚫';
                        statusClass = 'bg-slate-100 text-slate-400 border-slate-200 opacity-60';
                      }
                    }

                    return (
                      <td key={nom.nominee_id} className="px-4 py-3 text-center align-middle">
                        {score !== undefined ? (
                          <span className="font-bold text-navy-800 text-sm">
                            {score.toFixed(2)}
                          </span>
                        ) : (
                          <div title={blockReason} className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm mx-auto ${statusClass}`}>
                            {statusIcon}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Baris Nilai Akhir Rata-rata */}
              <tr className="bg-navy-50/50 border-t-2 border-navy-100">
                <td className="px-4 py-3 sticky left-0 bg-navy-50/50 border-r border-slate-200 z-10 font-bold text-navy-900">
                  RATA-RATA AKHIR
                </td>
                {data.nominees.map(nom => (
                  <td key={`avg-${nom.nominee_id}`} className="px-4 py-3 text-center border-b border-slate-200">
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-sm shadow-sm border border-emerald-200">
                      {Number(nom.skor_akhir_juri || 0).toFixed(2)}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Preferensi Juara 1, 2, 3 masing-masing juri */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-navy-900">Preferensi Juara Tiap Juri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.listJuri.map(juri => (
            <div key={juri.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-bold text-navy-800 border-b border-slate-100 pb-2 mb-3 truncate" title={juri.nama}>
                {juri.nama}
              </h4>
              <div className="space-y-3">
                {juri.ranking.filter(r => r.rank <= 3).map((rank) => {
                  let badge = null;
                  if (rank.rank === 1) badge = <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold w-12 text-center border border-amber-200">1ST</span>;
                  else if (rank.rank === 2) badge = <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold w-12 text-center border border-slate-200">2ND</span>;
                  else if (rank.rank === 3) badge = <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold w-12 text-center border border-orange-200">3RD</span>;
                  else badge = <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold w-12 text-center border border-slate-200">{rank.rank}TH</span>;

                  return (
                    <div key={rank.nominee_id} className="flex items-center gap-3">
                      {badge}
                      <div className="flex-1 flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-200">
                          <img 
                            src={rank.foto || (rank.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${rank.nip}.jpg` : `https://ui-avatars.com/api/?name=${encodeURIComponent(rank.nama)}`)} 
                            alt={rank.nama} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rank.nama)}&background=16324a&color=fff`;
                            }}
                          />
                        </div>
                        <p className="font-medium text-sm text-slate-800 truncate" title={rank.nama}>{rank.nama}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-navy-600">{rank.total_skor.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

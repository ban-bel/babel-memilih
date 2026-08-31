import React, { useState, useMemo } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export default function RekapDetailJuri({ detailJuri, loading, nominees }) {
  const [expandedId, setExpandedId] = useState(null);

  // Mengelompokkan data per nominee lalu per juri
  const detailPerNominee = useMemo(() => {
    if (!detailJuri) return {};
    
    const map = {};
    detailJuri.forEach((row) => {
      if (!map[row.nominee_id]) {
        map[row.nominee_id] = { juriList: {}, totalSkorAgg: 0, countJuri: 0 };
      }
      const nomMap = map[row.nominee_id];
      
      if (!nomMap.juriList[row.juri_id]) {
        nomMap.juriList[row.juri_id] = {
          nama_juri: row.juri?.nama || 'Juri Tidak Dikenal',
          kategori: [],
          totalSkor: 0,
          catatan: [],
          _catatanSet: new Set()
        };
        nomMap.countJuri += 1;
      }
      
      const juriMap = nomMap.juriList[row.juri_id];
      
      juriMap.kategori.push({
        nama_kategori: row.kategori?.nama_kategori || 'Kategori ?',
        skor: row.skor,
        bobot: row.kategori?.bobot_persen || 0
      });
      
      // Calculate weighted score for this category
      const weightedScore = row.skor * ((row.kategori?.bobot_persen || 0) / 100);
      juriMap.totalSkor += weightedScore;
      
      if (row.catatan_juri) {
        const cleanCatatan = row.catatan_juri.trim();
        if (!juriMap._catatanSet.has(cleanCatatan)) {
          juriMap.catatan.push({
            kategori: row.kategori?.nama_kategori,
            catatan: cleanCatatan
          });
          juriMap._catatanSet.add(cleanCatatan);
        } else {
          const existing = juriMap.catatan.find(c => c.catatan === cleanCatatan);
          if (existing) {
            existing.kategori = null; // Menjadi komentar umum karena berlaku untuk banyak/semua kategori
          }
        }
      }
    });
    
    return map;
  }, [detailJuri]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        Memuat rincian nilai juri...
      </div>
    );
  }

  if (!nominees || nominees.length === 0 || !detailJuri || detailJuri.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-xl font-bold text-navy-900">Rincian Nilai Panel Juri</h3>
      <div className="space-y-4">
        {nominees.map((n) => {
          const isExpanded = expandedId === n.nominee_id;
          const dataNominee = detailPerNominee[n.nominee_id] || { juriList: {} };
          const listJuri = Object.values(dataNominee.juriList);
          
          if (listJuri.length === 0) return null; // Sembunyikan jika belum ada nilai

          const scores = listJuri.map(j => j.totalSkor);
          const minScore = Math.min(...scores);
          const maxScore = Math.max(...scores);
          const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;

          return (
            <div key={n.nominee_id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : n.nominee_id)}
                className={`flex w-full items-center justify-between p-4 transition-colors ${
                  isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={n.foto_url || (n.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${n.nip}.jpg` : 'https://ui-avatars.com/api/?name='+encodeURIComponent(n.nama_nominee || n.nama || '-'))}
                    alt={n.nama_nominee || n.nama || '-'}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(n.nama_nominee || n.nama || '-')}&background=16324a&color=fff&size=128`;
                    }}
                  />
                  <div className="text-left">
                    <p className="font-bold text-navy-900 text-base">{n.nama_nominee || n.nama || '-'}</p>
                    <p className="text-xs text-slate-500">{n.unit_kerja}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-4 mr-4 text-right">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Min</p>
                      <p className="font-medium text-sm text-rose-600">{minScore.toFixed(2)}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Max</p>
                      <p className="font-medium text-sm text-emerald-600">{maxScore.toFixed(2)}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mean</p>
                      <p className="font-bold text-base text-navy-600">{meanScore.toFixed(2)}</p>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="p-4 bg-slate-50/50 overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="bg-slate-100/80 text-xs font-semibold text-slate-700 uppercase">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Nama Juri</th>
                        <th className="px-4 py-3">Rincian Kriteria</th>
                        <th className="px-4 py-3 text-center">Total Nilai (Bobot)</th>
                        <th className="px-4 py-3 rounded-tr-lg">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {listJuri.map((juri, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-3 font-medium text-slate-900 align-top min-w-[150px]">
                            {juri.nama_juri}
                          </td>
                          <td className="px-3 py-3 align-top min-w-[300px]">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                              {juri.kategori.map((k, kIdx) => (
                                <div key={kIdx} className="flex justify-between items-center border-b border-slate-100/70 pb-1">
                                  <span className="text-slate-500 truncate pr-2" title={`${k.nama_kategori} (${k.bobot}%)`}>
                                    {k.nama_kategori}
                                  </span>
                                  <span className="font-bold text-navy-800">
                                    {k.skor}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top text-center">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 font-bold text-sm shadow-sm border border-navy-100/50">
                              {juri.totalSkor.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top min-w-[200px]">
                            {juri.catatan.length > 0 ? (
                              <ul className="space-y-2">
                                {juri.catatan.map((c, cIdx) => (
                                  <li key={cIdx} className="text-xs bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                                    <span className="font-bold text-amber-800 block mb-0.5">{c.kategori || 'Catatan Umum'}</span>
                                    <span className="text-amber-900 italic">"{c.catatan}"</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Tidak ada catatan</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

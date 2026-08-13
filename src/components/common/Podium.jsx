import React from 'react';
import { Medal } from 'lucide-react';

export default function Podium({ top3, mode, isMode1BKategori, selectedKategori }) {
  if (!top3 || top3.length === 0) return null;

  // top3 is expected to be an array of up to 3 nominees sorted by rank (1, 2, 3)
  // We want to display them as: 2 (Left), 1 (Center), 3 (Right)
  const rank1 = top3.find((r) => getPeringkat(r, selectedKategori) === 1) || top3[0];
  const rank2 = top3.find((r) => getPeringkat(r, selectedKategori) === 2) || top3[1];
  const rank3 = top3.find((r) => getPeringkat(r, selectedKategori) === 3) || top3[2];

  const ordered = [
    { item: rank2, position: 2 },
    { item: rank1, position: 1 },
    { item: rank3, position: 3 },
  ];

  function getPeringkat(r, kategori) {
    if (!r) return 0;
    return kategori
      ? (r.peringkat ?? r.peringkat_dalam_kategori ?? 0)
      : (r.peringkat_keseluruhan ?? r.peringkat ?? 0);
  }

  function getSkorTampil(r) {
    if (!r) return '';
    if (mode === 'MODE_1A') return `${Number(r.skor_akhir_persen ?? 0).toFixed(1)}%`;
    if (mode === 'MODE_2') return Number(r.skor_akhir_juri ?? 0).toFixed(2);
    if (mode === 'MODE_2A') return `${Number(r.rata_rata_skor ?? 0).toFixed(1)} poin`;

    // MODE_1B Hybrid: berbeda antara overview dan per kategori
    if (mode === 'MODE_1B') {
      if (isMode1BKategori) {
        if (selectedKategori) {
          return `${r.total_suara ?? 0} suara`;
        } else {
          return `${r.total_keseluruhan ?? 0} suara`;
        }
      } else {
        // Normal MODE_1B (bukan hybrid)
        return `${r.total_suara ?? 0} suara`;
      }
    }
    return `${r.total_suara ?? 0} suara`;
  }

  return (
    <div className="flex flex-col md:flex-row items-end justify-center gap-4 py-10 px-4 mb-8">
      {ordered.map(({ item, position }) => {
        if (!item) return <div key={position} className="hidden md:block w-[30%] opacity-0"></div>;

        const isWinner = position === 1;
        const h = isWinner ? 'h-48 md:h-56' : position === 2 ? 'h-40 md:h-48' : 'h-32 md:h-40';
        const bg = isWinner ? 'bg-gradient-to-b from-gold-400 to-gold-600 shadow-gold-500/50' : 
                   position === 2 ? 'bg-gradient-to-b from-slate-300 to-slate-400 shadow-slate-400/50' : 
                   'bg-gradient-to-b from-amber-600 to-amber-700 shadow-amber-700/50';
        const ring = isWinner ? 'ring-gold-400' : position === 2 ? 'ring-slate-300' : 'ring-amber-600';

        return (
          <div key={position} className={`relative flex flex-col items-center w-full md:w-[28%] max-w-[200px] animate-slide-up delay-${position * 100}`}>
            {/* Avatar & Info */}
            <div className={`relative flex flex-col items-center mb-4 z-10 transition-transform hover:-translate-y-2`}>
              {isWinner && (
                <div className="absolute -top-10 animate-bounce">
                  <Medal className="h-10 w-10 text-gold-500 drop-shadow-lg" />
                </div>
              )}
              <div className={`p-1 bg-white rounded-full shadow-xl mb-3 ${isWinner ? 'w-24 h-24 ring-4 ' + ring : 'w-20 h-20 ring-4 ' + ring}`}>
                <img
                  src={item.foto_url || (item.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${item.nip}.jpg` : null)}
                  alt={item.nama_nominee || item.nama}
                  className="w-full h-full rounded-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama_nominee || item.nama || 'A')}&background=16324a&color=fff&size=128`;
                  }}
                />
              </div>
              <h4 className="text-center font-bold text-navy-900 line-clamp-1">{item.nama_nominee || item.nama}</h4>
              <p className="text-xs text-slate-500 text-center line-clamp-1">{item.unit_kerja}</p>
              <div className="mt-2 inline-flex items-center justify-center px-3 py-1 rounded-full bg-navy-900 text-white font-bold text-sm shadow-md">
                {getSkorTampil(item)}
              </div>
            </div>

            {/* Podium Block */}
            <div className={`w-full rounded-t-2xl shadow-lg relative overflow-hidden ${h} ${bg}`}>
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
              <div className="absolute inset-0 flex items-center justify-center text-white/40 font-black text-6xl md:text-8xl select-none">
                {position}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

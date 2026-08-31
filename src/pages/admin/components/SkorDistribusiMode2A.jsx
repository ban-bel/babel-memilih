import React, { useState } from "react";
import { BarChart2, ChevronDown, ChevronUp, Users } from "lucide-react";

function avatarSrc(item) {
  return item.foto_url
    || (item.nip || item.nip_baru ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${item.nip || item.nip_baru}.jpg` : null)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama_nominee || item.nama || "X")}&background=random`;
}

const RANK_CLS = [
  "w-8 h-8 rounded-full bg-amber-400 text-white font-black text-sm flex items-center justify-center shadow ring-2 ring-amber-200",
  "w-8 h-8 rounded-full bg-slate-400 text-white font-black text-sm flex items-center justify-center shadow ring-2 ring-slate-200",
  "w-8 h-8 rounded-full bg-orange-400 text-white font-black text-sm flex items-center justify-center shadow ring-2 ring-orange-200",
];

export default function SkorDistribusiMode2A({ nominees = [] }) {
  const [showAll, setShowAll] = useState(false);

  if (!nominees || nominees.length === 0) return null;

  const sorted = [...nominees].sort((a, b) => (b.rata_rata_skor ?? 0) - (a.rata_rata_skor ?? 0));
  const maxSkor = Math.max(...sorted.map(n => n.rata_rata_skor ?? 0), 1);
  const top3 = sorted.slice(0, 3);
  const displayed = showAll ? sorted : sorted.slice(0, 8);
  const totalPemilih = sorted[0]?.total_pemilih ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 print:hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <BarChart2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy-900">Distribusi Skor Kandidat</h3>
            <p className="text-xs text-slate-500">Perbandingan rata-rata skor seluruh kandidat dari {totalPemilih} penilai</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
          <Users className="w-4 h-4" />
          <span><strong className="text-slate-700">{totalPemilih}</strong> Penilai</span>
        </div>
      </div>

      {/* Hero Top 3 */}
      {top3.length > 0 && (
        <div className="px-6 py-6 bg-gradient-to-br from-blue-50 to-sky-50 border-b border-slate-100">
          <div className="flex items-end justify-center gap-4">
            {/* #2 */}
            {top3[1] && (
              <div className="flex flex-col items-center text-center w-28">
                <div className="relative">
                  <img src={avatarSrc(top3[1])} onError={e=>{e.target.onerror=null;e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(top3[1].nama_nominee||"X")+"&background=random";}} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" alt="" />
                  <div className={RANK_CLS[1] + " absolute -bottom-1 -right-1"} style={{width:"22px",height:"22px",fontSize:"11px"}}>2</div>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-3 truncate w-full">{top3[1].nama_nominee||top3[1].nama}</p>
                <p className="text-lg font-black text-blue-600">{Number(top3[1].rata_rata_skor ?? 0).toFixed(1)}</p>
                <p className="text-[10px] text-slate-400">poin</p>
              </div>
            )}
            {/* #1 */}
            <div className="flex flex-col items-center text-center w-36">
              <div className="text-2xl mb-1">&#x1F451;</div>
              <div className="relative">
                <img src={avatarSrc(top3[0])} onError={e=>{e.target.onerror=null;e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(top3[0].nama_nominee||"X")+"&background=random";}} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl" alt="" />
                <div className={RANK_CLS[0] + " absolute -bottom-1 -right-1"} style={{width:"26px",height:"26px",fontSize:"12px"}}>1</div>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-3 truncate w-full">{top3[0].nama_nominee||top3[0].nama}</p>
              <p className="text-xs text-slate-400 truncate w-full">{top3[0].unit_kerja}</p>
              <p className="text-2xl font-black mt-1 text-blue-600">{Number(top3[0].rata_rata_skor ?? 0).toFixed(1)}</p>
              <p className="text-[10px] text-slate-400">poin rata-rata</p>
            </div>
            {/* #3 */}
            {top3[2] && (
              <div className="flex flex-col items-center text-center w-28">
                <div className="relative">
                  <img src={avatarSrc(top3[2])} onError={e=>{e.target.onerror=null;e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(top3[2].nama_nominee||"X")+"&background=random";}} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" alt="" />
                  <div className={RANK_CLS[2] + " absolute -bottom-1 -right-1"} style={{width:"22px",height:"22px",fontSize:"11px"}}>3</div>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-3 truncate w-full">{top3[2].nama_nominee||top3[2].nama}</p>
                <p className="text-lg font-black text-blue-600">{Number(top3[2].rata_rata_skor ?? 0).toFixed(1)}</p>
                <p className="text-[10px] text-slate-400">poin</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bar Chart Tabel */}
      <div className="divide-y divide-slate-100">
        {displayed.map((item, index) => {
          const skor = Number(item.rata_rata_skor ?? 0);
          const min = Number(item.skor_terendah ?? 0);
          const max = Number(item.skor_tertinggi ?? 0);
          const pct = maxSkor > 0 ? (skor / maxSkor) * 100 : 0;
          const isTop3 = index < 3;
          const barColor = index === 0 ? "bg-amber-400" : index === 1 ? "bg-slate-400" : index === 2 ? "bg-orange-400" : "bg-blue-200";

          return (
            <div key={item.nominee_id} className={"flex items-center gap-3 px-6 py-3.5 " + (!isTop3 ? "bg-slate-50/30" : "bg-white")}>
              {/* Rank */}
              <div className={isTop3 ? RANK_CLS[index] : "w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center"}>
                {index + 1}
              </div>
              {/* Avatar */}
              <img src={avatarSrc(item)} onError={e=>{e.target.onerror=null;e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(item.nama_nominee||"X")+"&background=random";}} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm flex-shrink-0" alt="" />
              {/* Name + Bar */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.nama_nominee || item.nama}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={"h-2 rounded-full transition-all " + barColor} style={{width: pct + "%"}} />
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {min.toFixed(0)} - {max.toFixed(0)}
                  </span>
                </div>
              </div>
              {/* Score */}
              <div className="text-right flex-shrink-0">
                <span className={"text-lg font-black " + (isTop3 ? "text-blue-600" : "text-slate-500")}>{skor.toFixed(1)}</span>
                <span className="text-xs text-slate-400 ml-1">poin</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less */}
      {sorted.length > 8 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAll ? "Sembunyikan" : `Tampilkan ${sorted.length - 8} kandidat lainnya`}
          </button>
        </div>
      )}
    </div>
  );
}

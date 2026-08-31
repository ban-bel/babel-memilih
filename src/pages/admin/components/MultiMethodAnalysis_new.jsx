import React, { useState, useMemo } from "react";
import { TrendingUp, Medal, ChevronDown, ChevronUp, BarChart2, Scissors, Activity } from "lucide-react";

const TABS = [
  { id: "absolut", label: "Nilai Absolut", desc: "Rata-rata mentah",         icon: "B", color: "emerald" },
  { id: "borda",   label: "Borda Count",   desc: "Klasemen medali",          icon: "M", color: "amber"   },
  { id: "trimmed", label: "Trimmed Mean",  desc: "Buang nilai ekstrem",      icon: "S", color: "indigo"  },
  { id: "zscore",  label: "Z-Score",       desc: "Standardisasi bias juri",  icon: "A", color: "blue"    },
];

const C = {
  emerald: { active: "bg-emerald-600 text-white border-emerald-600", inactive: "bg-white text-slate-600 border-slate-200 hover:border-emerald-300", hero: "from-emerald-50 to-teal-50", accent: "text-emerald-600", footer: "bg-emerald-50 border-emerald-200" },
  amber:   { active: "bg-amber-500 text-white border-amber-500",     inactive: "bg-white text-slate-600 border-slate-200 hover:border-amber-300",   hero: "from-amber-50 to-yellow-50",   accent: "text-amber-600",   footer: "bg-amber-50 border-amber-200"   },
  indigo:  { active: "bg-indigo-600 text-white border-indigo-600",   inactive: "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",  hero: "from-indigo-50 to-violet-50", accent: "text-indigo-600", footer: "bg-indigo-50 border-indigo-200" },
  blue:    { active: "bg-blue-600 text-white border-blue-600",       inactive: "bg-white text-slate-600 border-slate-200 hover:border-blue-300",    hero: "from-blue-50 to-sky-50",     accent: "text-blue-600",   footer: "bg-blue-50 border-blue-200"     },
};

const RANK_CLS = [
  "w-8 h-8 rounded-full bg-amber-400 text-white font-black text-sm flex items-center justify-center shadow ring-2 ring-amber-200",
  "w-8 h-8 rounded-full bg-slate-400 text-white font-black text-sm flex items-center justify-center shadow ring-2 ring-slate-200",
  "w-8 h-8 rounded-full bg-orange-400 text-white font-black text-sm flex items-center justify-center shadow ring-2 ring-orange-200",
];

function tabIcon(id) {
  if (id === "absolut") return <BarChart2 className="w-4 h-4" />;
  if (id === "borda")   return <Medal className="w-4 h-4" />;
  if (id === "trimmed") return <Scissors className="w-4 h-4" />;
  return <Activity className="w-4 h-4" />;
}

function avatarSrc(item) {
  return item.foto_url
    || (item.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${item.nip}.jpg` : null)
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama_nominee || item.nama || "X")}&background=random`;
}

function Avatar({ item, size = 10 }) {
  const [err, setErr] = React.useState(false);
  return (
    <img
      src={err ? `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nama_nominee || item.nama || "X")}&background=random` : avatarSrc(item)}
      onError={() => setErr(true)}
      className={`w-${size} h-${size} rounded-full object-cover`}
      alt=""
    />
  );
}

export default function MultiMethodAnalysis({ detailJuri, nominees }) {
  const [activeTab, setActiveTab] = useState("absolut");
  const [expandedId, setExpandedId] = useState(null);

  const { absolut, borda, trimmed, zscore } = useMemo(() => {
    if (!detailJuri || !nominees || nominees.length === 0) return { absolut: [], borda: [], trimmed: [], zscore: [] };

    const juriMap = {};
    const juriScores = {};
    detailJuri.forEach(row => {
      if (!juriMap[row.juri_id]) juriMap[row.juri_id] = row.juri_nama || row.juri?.nama || ("Juri " + row.juri_id);
      if (!juriScores[row.juri_id]) juriScores[row.juri_id] = {};
      if (!juriScores[row.juri_id][row.nominee_id]) juriScores[row.juri_id][row.nominee_id] = 0;
      juriScores[row.juri_id][row.nominee_id] += row.skor * ((row.kategori?.bobot_persen || 0) / 100);
    });

    const nomineeResults = nominees.map(n => ({ ...n, skor_array: [] }));
    Object.entries(juriScores).forEach(([juriId, juriObj]) => {
      Object.entries(juriObj).forEach(([nomId, score]) => {
        const nom = nomineeResults.find(n => String(n.nominee_id) === String(nomId));
        if (nom) nom.skor_array.push({ juri_id: juriId, juri_nama: juriMap[juriId], score });
      });
    });

    // 1. Absolut
    const absolutRank = nomineeResults.map(n => {
      const total = n.skor_array.reduce((a, b) => a + b.score, 0);
      const avg = n.skor_array.length > 0 ? total / n.skor_array.length : 0;
      return { ...n, score: avg, details: { scores: n.skor_array, total, count: n.skor_array.length } };
    }).sort((a, b) => b.score - a.score);

    // 2. Borda
    const bordaScores = {};
    nominees.forEach(n => { bordaScores[n.nominee_id] = { total: 0, details: [] }; });
    Object.entries(juriScores).forEach(([juriId, juriObj]) => {
      const arr = Object.entries(juriObj).map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
      let rank = 1;
      for (let i = 0; i < arr.length; i++) {
        if (i > 0 && arr[i].score < arr[i-1].score) rank++;
        if (rank <= 3 && bordaScores[arr[i].id]) {
          const pts = rank === 1 ? 3 : rank === 2 ? 2 : 1;
          bordaScores[arr[i].id].total += pts;
          bordaScores[arr[i].id].details.push({ juri_nama: juriMap[juriId], rank, pts });
        }
      }
    });
    const bordaRank = nomineeResults.map(n => {
      const details = bordaScores[n.nominee_id]?.details || [];
      const gold = details.filter(d => d.pts === 3).length;
      const silver = details.filter(d => d.pts === 2).length;
      const bronze = details.filter(d => d.pts === 1).length;
      const absolutScore = n.skor_array.length > 0 ? n.skor_array.reduce((a,b)=>a+b.score,0)/n.skor_array.length : 0;
      return { ...n, score: bordaScores[n.nominee_id]?.total || 0, details, gold, silver, bronze, absolutScore };
    }).sort((a, b) => b.score !== a.score ? b.score - a.score : b.gold !== a.gold ? b.gold - a.gold : b.silver !== a.silver ? b.silver - a.silver : b.bronze !== a.bronze ? b.bronze - a.bronze : b.absolutScore - a.absolutScore);

    // 3. Trimmed
    const trimmedRank = nomineeResults.map(n => {
      let arr = [...n.skor_array].sort((a, b) => a.score - b.score);
      let dropped = [];
      if (arr.length >= 3) {
        dropped.push({...arr.shift(), reason: "Terendah"});
        dropped.push({...arr.pop(), reason: "Tertinggi"});
      }
      const total = arr.reduce((a, b) => a + b.score, 0);
      return { ...n, score: arr.length > 0 ? total / arr.length : 0, details: { used: arr, dropped, count: arr.length } };
    }).sort((a, b) => b.score - a.score);

    // 4. Z-Score
    const zByJuri = {};
    Object.keys(juriScores).forEach(juriId => {
      const vals = Object.values(juriScores[juriId]);
      const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
      const stddev = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length) || 1;
      zByJuri[juriId] = { mean, stddev };
    });
    const zscoreRank = nomineeResults.map(n => {
      const details = n.skor_array.map(s => {
        const { mean, stddev } = zByJuri[s.juri_id] || { mean: 0, stddev: 1 };
        return { juri_nama: s.juri_nama, raw: s.score, mean, stddev, z: (s.score - mean) / stddev };
      });
      const meanZ = details.length > 0 ? details.reduce((a,b)=>a+b.z,0)/details.length : 0;
      return { ...n, score: meanZ * 10 + 80, details };
    }).sort((a, b) => b.score - a.score);

    return { absolut: absolutRank, borda: bordaRank, trimmed: trimmedRank, zscore: zscoreRank };
  }, [detailJuri, nominees]);

  if (!detailJuri || detailJuri.length === 0) return null;

  const tabMap = { absolut, borda, trimmed, zscore };
  const currentData = tabMap[activeTab] || [];
  const meta = TABS.find(t => t.id === activeTab);
  const colors = C[meta.color];
  const top3 = currentData.slice(0, 3);

  const renderScore = (item) => activeTab === "borda" ? item.score + " Pts" : item.score.toFixed(2);

  const renderDetail = (item) => {
    const gridCls = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 text-sm";
    const cardCls = "flex justify-between items-center bg-white border border-slate-100 rounded-lg px-3 py-2";
    const footCls = `flex justify-between items-center rounded-lg px-3 py-2 border col-span-full font-bold ${colors.footer}`;

    if (activeTab === "absolut") return (
      <div className={gridCls}>
        {item.details.scores.map((s, i) => (
          <div key={i} className={cardCls}><span className="text-xs text-slate-600 truncate mr-2" title={s.juri_nama}>{s.juri_nama}</span><span className="font-bold">{s.score.toFixed(2)}</span></div>
        ))}
        <div className={footCls}><span>Rata-Rata ({item.details.count} Juri)</span><span className={colors.accent}>{item.score.toFixed(2)}</span></div>
      </div>
    );

    if (activeTab === "borda") {
      if (!item.details.length) return <div className="text-sm italic text-slate-500 bg-slate-50 px-4 py-3 rounded-xl border">Tidak mendapat medali dari juri manapun.</div>;
      return (
        <div className={gridCls}>
          {item.details.map((d, i) => (
            <div key={i} className={cardCls}>
              <span className="text-xs text-slate-600 truncate mr-2">{d.juri_nama}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold " + (d.rank===1?"bg-amber-100 text-amber-700":d.rank===2?"bg-slate-100 text-slate-600":"bg-orange-100 text-orange-700")}>{d.rank===1?"1ST":d.rank===2?"2ND":"3RD"}</span>
                <span className="font-bold">+{d.pts}</span>
              </div>
            </div>
          ))}
          <div className={footCls}><span>Total &bull; {item.gold} Emas / {item.silver} Perak / {item.bronze} Perunggu</span><span className={colors.accent}>{item.score} Pts</span></div>
        </div>
      );
    }

    if (activeTab === "trimmed") return (
      <div className={gridCls}>
        {item.details.used.map((s, i) => (
          <div key={i} className={cardCls}><span className="text-xs text-slate-600 truncate mr-2">{s.juri_nama}</span><span className="font-bold">{s.score.toFixed(2)}</span></div>
        ))}
        {item.details.dropped.map((s, i) => (
          <div key={"d"+i} className="flex justify-between items-center bg-rose-50/50 border border-rose-100 rounded-lg px-3 py-2 opacity-60">
            <span className="line-through text-xs text-slate-400 truncate mr-2">{s.juri_nama}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="line-through text-xs text-slate-400">{s.score.toFixed(2)}</span>
              <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold">{s.reason}</span>
            </div>
          </div>
        ))}
        <div className={footCls}><span>Rata-Rata Setelah Dipangkas ({item.details.count} Juri)</span><span className={colors.accent}>{item.score.toFixed(2)}</span></div>
      </div>
    );

    return (
      <div className={gridCls}>
        {item.details.map((d, i) => (
          <div key={i} className={cardCls}>
            <span className="text-xs text-slate-600 truncate mr-2 flex-1">{d.juri_nama}</span>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs">
              <span className="text-slate-400">Raw: {d.raw.toFixed(1)}</span>
              <span className={"font-bold " + (d.z>=0?"text-blue-600":"text-rose-500")}>Z: {d.z>0?"+":""}{d.z.toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className={footCls}><span>T-Score Konversi</span><span className={colors.accent}>{item.score.toFixed(2)}</span></div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 print:hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-xl"><TrendingUp className="w-5 h-5 text-indigo-600" /></div>
        <div>
          <h3 className="text-base font-bold text-navy-900">Analisis Multi-Metode</h3>
          <p className="text-xs text-slate-500">Bandingkan ranking kandidat menggunakan 4 metode statistik. Klik baris untuk detail per juri.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap gap-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const tc = C[tab.color];
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setExpandedId(null); }}
              className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all " + (isActive ? tc.active : tc.inactive)}>
              {tabIcon(tab.id)}
              <div className="text-left">
                <div>{tab.label}</div>
                <div className={"text-[10px] font-normal " + (isActive ? "opacity-75" : "text-slate-400")}>{tab.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hero Top 3 */}
      {top3.length > 0 && (
        <div className={"px-6 py-6 bg-gradient-to-br border-b border-slate-100 " + colors.hero}>
          <div className="flex items-end justify-center gap-4">
            {/* #2 */}
            {top3[1] && (
              <div className="flex flex-col items-center text-center w-28">
                <div className="relative">
                  <img src={avatarSrc(top3[1])} onError={e => {e.target.onerror=null; e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(top3[1].nama_nominee||"X")+"&background=random";}} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" alt="" />
                  <div className={"absolute -bottom-1 -right-1 " + RANK_CLS[1]} style={{width:"22px",height:"22px",fontSize:"11px"}}>2</div>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-3 truncate w-full">{top3[1].nama_nominee||top3[1].nama}</p>
                <p className={"text-lg font-black " + colors.accent}>{renderScore(top3[1])}</p>
              </div>
            )}
            {/* #1 */}
            <div className="flex flex-col items-center text-center w-36">
              <div className="text-2xl mb-1">&#x1F451;</div>
              <div className="relative">
                <img src={avatarSrc(top3[0])} onError={e => {e.target.onerror=null; e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(top3[0].nama_nominee||"X")+"&background=random";}} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl" alt="" />
                <div className={"absolute -bottom-1 -right-1 " + RANK_CLS[0]} style={{width:"26px",height:"26px",fontSize:"12px"}}>1</div>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-3 truncate w-full">{top3[0].nama_nominee||top3[0].nama}</p>
              <p className="text-xs text-slate-400 truncate w-full">{top3[0].unit_kerja}</p>
              <p className={"text-2xl font-black mt-1 " + colors.accent}>{renderScore(top3[0])}</p>
            </div>
            {/* #3 */}
            {top3[2] && (
              <div className="flex flex-col items-center text-center w-28">
                <div className="relative">
                  <img src={avatarSrc(top3[2])} onError={e => {e.target.onerror=null; e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(top3[2].nama_nominee||"X")+"&background=random";}} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" alt="" />
                  <div className={"absolute -bottom-1 -right-1 " + RANK_CLS[2]} style={{width:"22px",height:"22px",fontSize:"11px"}}>3</div>
                </div>
                <p className="text-xs font-semibold text-slate-700 mt-3 truncate w-full">{top3[2].nama_nominee||top3[2].nama}</p>
                <p className={"text-lg font-black " + colors.accent}>{renderScore(top3[2])}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Ranking Table */}
      <div className="divide-y divide-slate-100">
        {currentData.map((item, index) => {
          const isExpanded = expandedId === item.nominee_id;
          const isTop3 = index < 3;
          return (
            <div key={item.nominee_id}>
              <div
                className={"flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors select-none " + (!isTop3 ? "bg-slate-50/30" : "")}
                onClick={() => setExpandedId(isExpanded ? null : item.nominee_id)}
              >
                <div className={isTop3 ? RANK_CLS[index] : "w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm flex items-center justify-center"}>
                  {index + 1}
                </div>
                <img src={avatarSrc(item)} onError={e => {e.target.onerror=null; e.target.src="https://ui-avatars.com/api/?name="+encodeURIComponent(item.nama_nominee||"X")+"&background=random";}} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm flex-shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{item.nama_nominee||item.nama}</p>
                  <p className="text-xs text-slate-400 truncate">{item.unit_kerja}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={"text-lg font-black " + (isTop3 ? colors.accent : "text-slate-500")}>{renderScore(item)}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {isExpanded && (
                <div className="px-6 pb-4 pt-2 bg-slate-50/70 border-t border-slate-100">
                  {renderDetail(item)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, AlertTriangle, Medal, ChevronDown, ChevronUp } from 'lucide-react';

export default function MultiMethodAnalysis({ detailJuri, nominees }) {
  const [activeTab, setActiveTab] = useState('absolut');
  const [expandedId, setExpandedId] = useState(null);

  const { absolut, borda, trimmed, zscore } = useMemo(() => {
    if (!detailJuri || !nominees || nominees.length === 0) return { absolut: [], borda: [], trimmed: [], zscore: [] };

    const juriMap = {};
    const juriScores = {};
    detailJuri.forEach(row => {
      if (!juriMap[row.juri_id]) juriMap[row.juri_id] = row.juri_nama || row.juri?.nama || ('Juri ' + row.juri_id);
      if (!juriScores[row.juri_id]) juriScores[row.juri_id] = {};
      if (!juriScores[row.juri_id][row.nominee_id]) juriScores[row.juri_id][row.nominee_id] = 0;
      const weightedScore = row.skor * ((row.kategori?.bobot_persen || 0) / 100);
      juriScores[row.juri_id][row.nominee_id] += weightedScore;
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

    // 2. Borda Count
    const bordaScores = {};
    nominees.forEach(n => bordaScores[n.nominee_id] = { total: 0, details: [] });
    
    Object.entries(juriScores).forEach(([juriId, juriObj]) => {
      const arr = Object.entries(juriObj).map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
      let currentRank = 1;
      for (let i = 0; i < arr.length; i++) {
        if (i > 0 && arr[i].score < arr[i-1].score) currentRank++;
        if (currentRank <= 3 && bordaScores[arr[i].id]) {
          let pts = currentRank === 1 ? 3 : currentRank === 2 ? 2 : 1;
          bordaScores[arr[i].id].total += pts;
          bordaScores[arr[i].id].details.push({ juri_nama: juriMap[juriId], rank: currentRank, pts });
        }
      }
    });

    const bordaRank = nomineeResults.map(n => {
      const details = bordaScores[n.nominee_id]?.details || [];
      const gold = details.filter(d => d.pts === 3).length;
      const silver = details.filter(d => d.pts === 2).length;
      const bronze = details.filter(d => d.pts === 1).length;
      const absolutScore = n.skor_array.length > 0 ? n.skor_array.reduce((a,b)=>a+b.score,0)/n.skor_array.length : 0;
      
      return {
        ...n, 
        score: bordaScores[n.nominee_id]?.total || 0,
        details,
        gold, silver, bronze, absolutScore
      };
    }).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // 1. Total Poin
      if (b.gold !== a.gold) return b.gold - a.gold;     // 2. Emas (1ST) Terbanyak
      if (b.silver !== a.silver) return b.silver - a.silver; // 3. Perak (2ND) Terbanyak
      if (b.bronze !== a.bronze) return b.bronze - a.bronze; // 4. Perunggu (3RD) Terbanyak
      return b.absolutScore - a.absolutScore;            // 5. Rata-rata Absolut
    });

    // 3. Trimmed
    const trimmedRank = nomineeResults.map(n => {
      let arr = [...n.skor_array].sort((a, b) => a.score - b.score);
      let dropped = [];
      if (arr.length >= 3) { 
        dropped.push({...arr.shift(), reason: 'Terendah'}); 
        dropped.push({...arr.pop(), reason: 'Tertinggi'}); 
      }
      const total = arr.reduce((a, b) => a + b.score, 0);
      const avg = arr.length > 0 ? total / arr.length : 0;
      return { ...n, score: avg, details: { used: arr, dropped } };
    }).sort((a, b) => b.score - a.score);

    // 4. Z-Score
    const juriStats = {};
    Object.entries(juriScores).forEach(([juriId, juriObj]) => {
      const scores = Object.values(juriObj);
      const n = scores.length;
      if (n === 0) return;
      const mean = scores.reduce((a, b) => a + b, 0) / n;
      const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
      const stddev = Math.sqrt(variance);
      juriStats[juriId] = { mean, stddev };
    });

    const zScoreNominees = {};
    Object.entries(juriScores).forEach(([juriId, juriObj]) => {
      const { mean, stddev } = juriStats[juriId];
      Object.entries(juriObj).forEach(([nomId, score]) => {
        let z = 0;
        if (stddev > 0) z = (score - mean) / stddev;
        if (!zScoreNominees[nomId]) zScoreNominees[nomId] = [];
        zScoreNominees[nomId].push({ juri_nama: juriMap[juriId], z, raw: score, mean, stddev });
      });
    });

    const zscoreRank = nomineeResults.map(n => {
      const zArr = zScoreNominees[n.nominee_id] || [];
      const totalZ = zArr.reduce((a, b) => a + b.z, 0);
      const avgZ = zArr.length > 0 ? totalZ / zArr.length : 0;
      const tScore = (avgZ * 10) + 80;
      return { ...n, score: tScore, details: zArr };
    }).sort((a, b) => b.score - a.score);

    return { absolut: absolutRank, borda: bordaRank, trimmed: trimmedRank, zscore: zscoreRank };
  }, [detailJuri, nominees]);

  if (!detailJuri || detailJuri.length === 0) return null;

  const tabs = [
    { id: 'absolut', label: 'Nilai Absolut', desc: 'Rata-rata mutlak' },
    { id: 'borda', label: 'Borda Count', desc: 'Sistem klasemen medali' },
    { id: 'trimmed', label: 'Trimmed Mean', desc: 'Abaikan nilai ekstrem' },
    { id: 'zscore', label: 'Z-Score', desc: 'Standardisasi bias juri' },
  ];

  let currentData = absolut;
  if (activeTab === 'borda') currentData = borda;
  if (activeTab === 'trimmed') currentData = trimmed;
  if (activeTab === 'zscore') currentData = zscore;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderDetails = (item) => {
    if (activeTab === 'absolut') {
      return (
        <div className="bg-slate-50 rounded-lg p-4 mt-3 border border-slate-200 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {item.details.scores.map((s, i) => (
              <div key={i} className="flex justify-between border-b border-slate-200 border-dashed pb-1">
                <span className="text-slate-600 truncate mr-2" title={s.juri_nama}>{s.juri_nama}</span>
                <span className="font-bold text-navy-800">{s.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between font-bold text-navy-900 bg-emerald-50/50 p-2 rounded">
            <span>Rata-Rata ({item.details.total.toFixed(2)} / {item.details.count})</span>
            <span>{item.score.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'borda') {
      if (item.details.length === 0) return <div className="bg-slate-50 p-3 mt-3 text-sm italic text-slate-500 rounded border">Tidak mendapat medali (Top 3) dari juri manapun.</div>;
      return (
        <div className="bg-slate-50 rounded-lg p-4 mt-3 border border-slate-200 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {item.details.map((d, i) => (
              <div key={i} className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                <span className="text-slate-600 truncate flex-1">{d.juri_nama}</span>
                <div className="flex items-center gap-3 w-32 justify-end">
                  <span className={'text-[10px] px-2 py-1 rounded font-bold ' + (d.rank===1 ? 'bg-amber-100 text-amber-700' : d.rank===2 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700')}>
                    {d.rank === 1 ? '1ST' : d.rank === 2 ? '2ND' : '3RD'}
                  </span>
                  <span className="font-bold text-navy-800 w-10 text-right">+{d.pts} Pts</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-300 flex justify-between font-bold text-navy-900 bg-amber-50/50 p-2 rounded">
            <span>Total Poin Klasemen</span>
            <span>{item.score} Pts</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 bg-slate-100/50 p-2 rounded border border-slate-200">
            <strong>Aturan Seri (Tie-Breaker):</strong> Jika poin sama, peringkat ditentukan dari perolehan medali tertinggi. 
            Kandidat ini memperoleh: 
            <span className="font-bold text-amber-600 ml-1">{item.gold} Emas (1ST)</span>, 
            <span className="font-bold text-slate-500 mx-1">{item.silver} Perak (2ND)</span>, 
            <span className="font-bold text-orange-600">{item.bronze} Perunggu (3RD)</span>.
          </div>
        </div>
      );
    }

    if (activeTab === 'trimmed') {
      return (
        <div className="bg-slate-50 rounded-lg p-4 mt-3 border border-slate-200 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {item.details.used.map((s, i) => (
              <div key={i} className="flex justify-between border-b border-slate-200 border-dashed pb-1">
                <span className="text-slate-600 truncate mr-2">{s.juri_nama}</span>
                <span className="font-bold text-navy-800">{s.score.toFixed(2)}</span>
              </div>
            ))}
            {item.details.dropped.map((s, i) => (
              <div key={'d'+i} className="flex justify-between border-b border-slate-200 border-dashed pb-1 opacity-50">
                <span className="text-slate-500 line-through truncate mr-2">{s.juri_nama}</span>
                <div className="text-right">
                  <span className="line-through text-slate-500 mr-2">{s.score.toFixed(2)}</span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1 rounded">{s.reason}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between font-bold text-navy-900 bg-indigo-50/50 p-2 rounded">
            <span>Rata-Rata Setelah Dipangkas</span>
            <span>{item.score.toFixed(2)}</span>
          </div>
        </div>
      );
    }

    if (activeTab === 'zscore') {
      return (
        <div className="bg-slate-50 rounded-lg p-4 mt-3 border border-slate-200 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {item.details.map((d, i) => (
              <div key={i} className="flex flex-col xl:flex-row justify-between border-b border-slate-200 border-dashed pb-2 gap-1 xl:gap-2">
                <span className="text-slate-700 font-medium truncate flex-1">{d.juri_nama}</span>
                <div className="flex justify-between sm:justify-end gap-4 sm:gap-6 text-xs w-full sm:w-auto">
                  <span className="text-slate-500 w-24">Raw: {d.raw.toFixed(1)}</span>
                  <span className="text-slate-500 w-24">Rata-rata: {d.mean.toFixed(1)} (Std: {d.stddev.toFixed(1)})</span>
                  <span className="font-bold text-navy-800 w-16 text-right">Z: {d.z > 0 ? '+'+d.z.toFixed(2) : d.z.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-300 flex justify-between font-bold text-navy-900 bg-blue-50/50 p-2 rounded">
            <span>T-Score Konversi ((Mean Z * 10) + 80)</span>
            <span>{item.score.toFixed(2)}</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 print:hidden">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-500" />
          Analisis Multi-Metode (Insight)
        </h3>
        <p className="text-sm text-slate-500 mt-1">Bandingkan pemenang jika dihitung menggunakan teori statistik yang berbeda. Klik baris kandidat untuk melihat detail perhitungan.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setExpandedId(null); }}
            className={"px-4 py-2 rounded-xl text-sm font-bold transition-all " + (activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')}
          >
            <div className="text-left">
              <div>{tab.label}</div>
              <div className={"text-[10px] font-normal " + (activeTab === tab.id ? 'text-indigo-500' : 'text-slate-400')}>{tab.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {currentData.slice(0, 5).map((item, index) => {
          const isWinner = index === 0;
          const isExpanded = expandedId === item.nominee_id;
          return (
            <div key={item.nominee_id} className={"rounded-xl border transition-all overflow-hidden " + (isWinner ? 'bg-amber-50/30 border-amber-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300')}>
              <div 
                className="flex items-center gap-4 p-4 cursor-pointer select-none"
                onClick={() => toggleExpand(item.nominee_id)}
              >
                <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 " + (isWinner ? 'bg-amber-400 text-white shadow-sm' : 'bg-slate-100 text-slate-500')}>
                  {index + 1}
                </div>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex-shrink-0">
                  <img 
                    src={item.foto_url || (item.nip ? 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/' + item.nip + '.jpg' : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.nama_nominee))} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.nama_nominee); }}
                    alt={item.nama_nominee}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={"font-bold truncate " + (isWinner ? 'text-amber-900' : 'text-slate-800')}>{item.nama_nominee || item.nama}</h4>
                  <p className="text-xs text-slate-500 truncate">{item.unit_kerja}</p>
                </div>
                <div className="text-right flex items-center gap-4 flex-shrink-0">
                  <div className={"text-xl font-black " + (isWinner ? 'text-amber-600' : 'text-slate-700')}>
                    {activeTab === 'borda' ? item.score + ' Pts' : item.score.toFixed(2)}
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white">
                  {renderDetails(item)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



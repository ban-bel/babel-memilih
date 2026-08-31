import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/DashboardKakan.jsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { fetchPeriodeList, fetchWilayahList } from '../../services/adminService';",
  "import { fetchPeriodeList, fetchWilayahList, fetchDaftarJuriLengkap } from '../../services/adminService';"
);
content = content.replace(
  "import MatrixJuriJuara from './components/MatrixJuriJuara';",
  "import MatrixJuriJuara from './components/MatrixJuriJuara';\nimport MultiMethodAnalysis from './components/MultiMethodAnalysis';"
);
content = content.replace(
  "import Podium from '../../components/common/Podium';",
  "import Podium from '../../components/common/Podium';\nimport Modal from '../../components/common/Modal';"
);
content = content.replace(
  "ChevronUp, Crown } from 'lucide-react';",
  "ChevronUp, Crown, Info } from 'lucide-react';"
);

// 2. Query
content = content.replace(
  "queryFn: () => fetchDetailPenilaianJuri(Number(periodeId)),\n    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,\n  });",
  "queryFn: () => fetchDetailPenilaianJuri(Number(periodeId)),\n    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,\n  });\n\n  const { data: daftarJuri = [] } = useQuery({\n    queryKey: ['daftar-juri', periodeId],\n    queryFn: () => fetchDaftarJuriLengkap(Number(periodeId)),\n    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,\n  });"
);

// 3. States
content = content.replace(
  "const [error, setError] = useState(null);",
  "const [error, setError] = useState(null);\n  const [showGlossary, setShowGlossary] = useState(false);"
);

// 4. Header title
content = content.replace(
  '<h1 className="font-display text-2xl font-bold text-navy-900">Dashboard Kakan</h1>',
  '<div className="flex items-center gap-2">\n            <h1 className="font-display text-2xl font-bold text-navy-900">Dashboard Kakan</h1>\n            {mode === MODE_PENILAIAN.MODE_2 && (\n              <button onClick={() => setShowGlossary(true)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors" title="Penjelasan Perhitungan">\n                <Info className="w-5 h-5" />\n              </button>\n            )}\n          </div>'
);
content = content.replace(
  '<span className="font-semibold text-navy-900">Rekap Keseluruhan (Top {topN} Disorot)</span>',
  '<span className="font-semibold text-navy-900">{mode === MODE_PENILAIAN.MODE_2 ? "Analisis Keputusan & Rekapitulasi" : `Rekap Keseluruhan (Top ${topN} Disorot)`}</span>'
);

// 5. Encoding fix
content = content.replace(
  "{opt.mode} · {opt.status}",
  "{opt.mode} &bull; {opt.status}"
);
content = content.replace(
  "{opt.mode} Â· {opt.status}",
  "{opt.mode} &bull; {opt.status}"
);

// 6. Podium to Matrix & MultiMethod
content = content.replace(
  "            {/* Podium Visualization */}\n            {!loadingRekap && rekapTopN.length > 0 && (\n              <Podium \n                top3={rekapTopN.slice(0, 3)} \n                mode={mode} \n                isMode1BKategori={isMode1BKategori} \n                selectedKategori={selectedKategori} \n              />\n            )}",
  "            {/* Podium Visualization (Hidden for Mode 2) */}\n            {!loadingRekap && mode !== MODE_PENILAIAN.MODE_2 && rekapTopN.length > 0 && (\n              <Podium \n                top3={rekapTopN.slice(0, 3)} \n                mode={mode} \n                isMode1BKategori={isMode1BKategori} \n                selectedKategori={selectedKategori} \n              />\n            )}\n\n            {/* Multi-Method Analysis & Matrix (Mode 2 Only) */}\n            {!loadingRekap && mode === MODE_PENILAIAN.MODE_2 && rekapTopN.length > 0 && detailJuri.length > 0 && (\n              <>\n                <MultiMethodAnalysis \n                  detailJuri={detailJuri}\n                  nominees={rekapTopN}\n                />\n                <MatrixJuriJuara \n                  detailJuri={detailJuri} \n                  loading={loadingDetailJuri} \n                  nominees={rekapTopN} \n                  daftarJuri={daftarJuri}\n                />\n              </>\n            )}"
);

// 7. Hide table for mode 2
content = content.replace(
  '<table className="w-full text-left text-sm">',
  '{mode !== MODE_PENILAIAN.MODE_2 && (\n              <table className="w-full text-left text-sm">'
);
content = content.replace(
  '</table>',
  '</table>\n            )}'
);

// 8. Modal
const modalHtml = `
          <Modal isOpen={showGlossary} onClose={() => setShowGlossary(false)} title="Glosarium & Penjelasan Perhitungan">
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="font-bold text-navy-900 mb-1">1. Nilai Absolut</h4>
                <p>Metode perhitungan yang merata-ratakan seluruh skor murni (0-100) yang diberikan oleh setiap juri kepada kandidat.</p>
              </div>
              <div>
                <h4 className="font-bold text-navy-900 mb-1">2. Borda Count (Sistem Klasemen Medali)</h4>
                <p>Metode perhitungan menggunakan sistem poin klasemen (dense ranking). Juri memberikan peringkat 1, 2, 3 kepada kandidat, yang masing-masing dikonversi menjadi 3 Pts, 2 Pts, dan 1 Pts.</p>
              </div>
              <div>
                <h4 className="font-bold text-navy-900 mb-1">3. Trimmed Mean</h4>
                <p>Rata-rata murni yang membuang 1 nilai tertinggi dan 1 nilai terendah untuk menghilangkan skor ekstrem (sangat tinggi/sangat rendah) yang mungkin bias.</p>
              </div>
              <div>
                <h4 className="font-bold text-navy-900 mb-1">4. Z-Score (T-Score)</h4>
                <p>Penilaian statistik yang menstandarisasi skor berdasarkan rata-rata dan simpangan baku masing-masing juri untuk menghilangkan bias karakter juri (pelit nilai vs murah hati). Diubah ke rentang T-Score agar lebih mudah dibaca.</p>
              </div>
            </div>
          </Modal>
`;

content = content.replace(
  "        </div>\n      </div>\n    </>\n  );\n}",
  modalHtml + "        </div>\n      </div>\n    </>\n  );\n}"
);

fs.writeFileSync('src/pages/admin/DashboardKakan.jsx', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/DashboardKakan.jsx', 'utf8');

// 1. Imports
content = content.replace(
  "import { fetchPeriodeList, fetchWilayahList } from '../../services/adminService';",
  "import { fetchPeriodeList, fetchWilayahList, fetchDaftarJuriLengkap } from '../../services/adminService';"
);
content = content.replace(
  "import Podium from '../../components/common/Podium';",
  "import Podium from '../../components/common/Podium';\nimport Modal from '../../components/common/Modal';\nimport MatrixJuriJuara from './components/MatrixJuriJuara';\nimport MultiMethodAnalysis from './components/MultiMethodAnalysis';"
);
content = content.replace(
  "ChevronUp, Crown } from 'lucide-react';",
  "ChevronUp, Crown, Info } from 'lucide-react';"
);

// 2. Query
if (!content.includes('fetchDaftarJuriLengkap(Number(periodeId))')) {
  content = content.replace(
    "queryFn: () => fetchDetailPenilaianJuri(Number(periodeId)),\n    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,\n  });",
    "queryFn: () => fetchDetailPenilaianJuri(Number(periodeId)),\n    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,\n  });\n\n  const { data: daftarJuri = [] } = useQuery({\n    queryKey: ['daftar-juri', periodeId],\n    queryFn: () => fetchDaftarJuriLengkap(Number(periodeId)),\n    enabled: Boolean(periodeId) && mode === MODE_PENILAIAN.MODE_2,\n  });"
  );
}

// 3. States
if (!content.includes("showGlossary")) {
  content = content.replace(
    "const [error, setError] = useState(null);",
    "const [error, setError] = useState(null);\n  const [showGlossary, setShowGlossary] = useState(false);"
  );
}

// 4. Header title
if (!content.includes("setShowGlossary")) {
  content = content.replace(
    '<h1 className="font-display text-2xl font-bold text-navy-900">Dashboard Kakan</h1>',
    '<div className="flex items-center gap-2">\n            <h1 className="font-display text-2xl font-bold text-navy-900">Dashboard Kakan</h1>\n            {mode === MODE_PENILAIAN.MODE_2 && (\n              <button onClick={() => setShowGlossary(true)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors" title="Penjelasan Perhitungan">\n                <Info className="w-5 h-5" />\n              </button>\n            )}\n          </div>'
  );
}

// 5. Encoding fix
content = content.replace(/\{opt\.mode\} [·Â·] \{opt\.status\}/g, "{opt.mode} &bull; {opt.status}");

fs.writeFileSync('src/pages/admin/DashboardKakan.jsx', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/DashboardKakan.jsx', 'utf8');

// 6. Injection & Hiding table
if (!content.includes('<MultiMethodAnalysis')) {
  let searchStr = `            {/* Podium Visualization */}`;
  let replaceIdx = content.indexOf(searchStr);
  if (replaceIdx !== -1) {
    let before = content.substring(0, replaceIdx);
    let after = content.substring(replaceIdx);
    
    // Find the end of Podium block
    let endPodium = after.indexOf(')}', after.indexOf('<Podium')) + 2;
    let afterPodium = after.substring(endPodium);
    
    // Find the start of the table
    let tableIdx = afterPodium.indexOf('<table');
    let beforeTable = afterPodium.substring(0, tableIdx);
    
    // Find the end of the table
    let tableEndIdx = afterPodium.indexOf('</table>', tableIdx) + 8;
    let tableBlock = afterPodium.substring(tableIdx, tableEndIdx);
    let afterTable = afterPodium.substring(tableEndIdx);
    
    let injected = `
            {/* Multi-Method Analysis & Matrix (Mode 2 Only) */}
            {!loadingRekap && mode === MODE_PENILAIAN.MODE_2 && rekapTopN.length > 0 && detailJuri.length > 0 && (
              <>
                <MultiMethodAnalysis 
                  detailJuri={detailJuri}
                  nominees={rekapTopN}
                />
                <MatrixJuriJuara 
                  detailJuri={detailJuri} 
                  loading={loadingDetailJuri} 
                  nominees={rekapTopN} 
                  daftarJuri={daftarJuri}
                />
              </>
            )}

            {mode !== MODE_PENILAIAN.MODE_2 && (
${tableBlock}
            )}
`;
    content = before + searchStr + after.substring(searchStr.length, endPodium) + beforeTable + injected + afterTable;
  }
}

// 7. Modal
if (!content.includes('1. Nilai Absolut')) {
  let modalStr = `
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
  let endDivStr = `          </div>\n        </div>\n      )}\n    </>\n  );\n}`;
  if (content.includes(endDivStr)) {
    content = content.replace(endDivStr, `          </div>\n${modalStr}        </div>\n      )}\n    </>\n  );\n}`);
  }
}

fs.writeFileSync('src/pages/admin/DashboardKakan.jsx', content, 'utf8');

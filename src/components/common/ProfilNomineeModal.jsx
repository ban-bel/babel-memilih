import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Table } from 'lucide-react';

const getPreviewUrl = (url) => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    return url.replace(/\/view.*$/, '/preview');
  }
  return url;
};

export default function ProfilNomineeModal({ isOpen, onClose, nominee }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasTabel = (tabelData) => {
    if (!tabelData) return false;
    let arr = [];
    if (Array.isArray(tabelData)) arr = tabelData;
    else if (typeof tabelData === 'string') {
      try { arr = JSON.parse(tabelData); } catch (e) { return false; }
    }
    return arr.length > 0;
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, nominee]);


  const getTabelData = (tabelData) => {
    if (!tabelData) return [];
    if (Array.isArray(tabelData)) return tabelData;
    if (typeof tabelData === 'string') {
      try { return JSON.parse(tabelData); } catch (e) { return []; }
    }
    return [];
  };

  if (!mounted || !isOpen || !nominee) return null;

  const tabelData = getTabelData(nominee.tabel_kehadiran);
  const showTabelTab = tabelData.length > 0;
  const showPdfTab = Boolean(nominee.dokumen_link);
  const previewUrl = getPreviewUrl(nominee.dokumen_link);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-scale-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src={nominee.foto_url || (nominee.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${nominee.nip}.jpg` : null)}
              alt={nominee.nama}
              className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nominee.nama || 'N')}&background=16324a&color=fff&size=64`;
              }}
            />
            <div>
              <h3 className="font-display font-bold text-navy-900 leading-tight">{nominee.nama}</h3>
              <p className="text-xs text-slate-500">{nominee.unit_kerja}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors self-end sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col">
          {showPdfTab && (
            <div className="flex-1 flex flex-col min-h-[500px] animate-fade-in">
              <h4 className="font-semibold text-navy-900 flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-navy-500" />
                Preview Dokumen
              </h4>
              <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white min-h-[400px]">
                <iframe
                  src={previewUrl}
                  title="PDF Viewer"
                  className="w-full h-full border-none"
                  allow="autoplay"
                ></iframe>
              </div>
            </div>
          )}

          {showTabelTab && showPdfTab && (
            <hr className="my-8 border-slate-200 border-dashed" />
          )}

          {showTabelTab && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-semibold text-navy-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-navy-500" />
                Rekapitulasi Kehadiran
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-navy-50 text-navy-800 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Periode</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">TL1</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">TL2</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">PSW4</th>
                      <th className="px-4 py-3 font-semibold text-center w-24">KJK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tabelData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.label_baris}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.tl1}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.tl2}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.psw4}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{row.kjk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

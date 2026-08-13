import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Table, Send, Loader2, CheckSquare } from 'lucide-react';

const getPreviewUrl = (url) => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    return url.replace(/\/view.*$/, '/preview');
  }
  return url;
};

export default function ProfilNomineeModal({ isOpen, onClose, nominee, onVoteClick }) {
  const [mounted, setMounted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check initial scrollability
  useEffect(() => {
    if (isOpen) {
      setIsChecked(false);
      // Give DOM time to render content
      setTimeout(() => {
        if (scrollRef.current) {
          const { scrollHeight, clientHeight } = scrollRef.current;
          if (scrollHeight <= clientHeight + 10) {
            setHasScrolledToBottom(true);
          } else {
            setHasScrolledToBottom(false);
          }
        }
      }, 300);
    }
  }, [isOpen, nominee]);

  const handleScroll = (e) => {
    if (hasScrolledToBottom) return;
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Buffer of 20px to make it easier for users
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setHasScrolledToBottom(true);
    }
  };

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
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col"
        >
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
                    {tabelData.map((row, idx) => {
                      const isBad = (val, isTime = false) => {
                        if (!val) return false;
                        const str = String(val).trim();
                        if (isTime) return str !== '00:00:00' && str !== '0';
                        return str !== '0';
                      };

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.label_baris}</td>
                          <td className={`px-4 py-3 text-center ${isBad(row.tl1) ? 'text-red-600 font-bold bg-red-50/30' : 'text-slate-600'}`}>{row.tl1}</td>
                          <td className={`px-4 py-3 text-center ${isBad(row.tl2) ? 'text-red-600 font-bold bg-red-50/30' : 'text-slate-600'}`}>{row.tl2}</td>
                          <td className={`px-4 py-3 text-center ${isBad(row.psw4) ? 'text-red-600 font-bold bg-red-50/30' : 'text-slate-600'}`}>{row.psw4}</td>
                          <td className={`px-4 py-3 text-center ${isBad(row.kjk, true) ? 'text-red-600 font-bold bg-red-50/30' : 'text-slate-600'}`}>{row.kjk}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          
          <div className="mb-4">
            <label 
              className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
                hasScrolledToBottom 
                  ? 'cursor-pointer hover:bg-slate-50 border-slate-200' 
                  : 'cursor-not-allowed bg-slate-50/50 border-slate-200 opacity-70'
              } ${isChecked ? 'bg-navy-50/50 border-navy-300 ring-1 ring-navy-300' : ''}`}
            >
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  disabled={!hasScrolledToBottom}
                  className="w-5 h-5 rounded border-slate-300 text-navy-600 focus:ring-navy-500 disabled:opacity-50 transition-all cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${hasScrolledToBottom ? 'text-navy-900' : 'text-slate-500'}`}>
                  Saya telah meninjau dokumen profil dan rekapitulasi kehadiran nominee ini.
                </p>
                {!hasScrolledToBottom && (
                  <p className="text-xs text-red-500 mt-1.5 animate-pulse-soft font-medium">
                    *Gulir (scroll) layar ke bagian paling bawah untuk mengaktifkan persetujuan.
                  </p>
                )}
              </div>
            </label>
          </div>

          <button
            onClick={onVoteClick}
            disabled={!isChecked}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 font-bold text-white shadow-lg transition-all ${
              !isChecked
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gold-500 hover:bg-gold-600 hover:shadow-xl active:scale-[0.98]'
            }`}
          >
            <Send className="h-5 w-5" />
            Pilih {nominee.nama}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

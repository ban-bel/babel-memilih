import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';

const CONFIG = {
  portofolio_pengembangan: {
    title: 'Portofolio Pengembangan Diri',
    icon: '📚',
    columns: [
      { key: 'bentuk', label: 'Bentuk Pengembangan Diri', type: 'text' },
      { key: 'tahun', label: 'Tahun Perolehan', type: 'number' },
      { key: 'penyelenggara', label: 'Penyelenggara', type: 'text' },
      { key: 'link', label: 'Tautan/Link Bukti Dukung (G-Drive)', type: 'url' },
    ]
  },
  portofolio_inovasi: {
    title: 'Portofolio Inovasi',
    icon: '💡',
    columns: [
      { key: 'nama', label: 'Nama Inovasi', type: 'text' },
      { key: 'bentuk', label: 'Bentuk Inovasi', type: 'text' },
      { key: 'cakupan', label: 'Cakupan Inovasi', type: 'text' },
      { key: 'deskripsi', label: 'Deskripsi Singkat', type: 'textarea' },
      { key: 'tahun', label: 'Tahun Pengembangan', type: 'number' },
      { key: 'link', label: 'Tautan/Link Bukti Dukung (G-Drive)', type: 'url' },
    ]
  },
  portofolio_penghargaan: {
    title: 'Portofolio Penghargaan',
    icon: '🏆',
    columns: [
      { key: 'nama', label: 'Nama Penghargaan', type: 'text' },
      { key: 'pemberi', label: 'Pemberi Penghargaan', type: 'text' },
      { key: 'deskripsi', label: 'Deskripsi Singkat', type: 'textarea' },
      { key: 'tahun', label: 'Tahun Perolehan', type: 'number' },
      { key: 'link', label: 'Tautan/Link Bukti Dukung (G-Drive)', type: 'url' },
    ]
  }
};

export default function FormPortofolioNominee({ type, dataTersimpan, onSimpan }) {
  const config = CONFIG[type];
  const [rows, setRows] = useState(dataTersimpan || []);
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [error, setError] = useState(null);
  
  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    setRows(dataTersimpan || []);
    setStatus('idle');
  }, [dataTersimpan]);

  const isValidUrl = (url) => {
    if (!url) return true; // optional
    return url.startsWith('http://') || url.startsWith('https://');
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      // Validate URLs before saving
      let hasInvalidUrl = false;
      rows.forEach(row => {
        if (row.link && !isValidUrl(row.link)) {
          hasInvalidUrl = true;
        }
      });

      if (hasInvalidUrl) {
        setStatus('error');
        setError('Tautan/Link harus diawali dengan http:// atau https://');
        return;
      }

      setStatus('saving');
      setError(null);
      
      try {
        await onSimpan(rows);
        setStatus('saved');
        setTimeout(() => setStatus(prev => prev === 'saved' ? 'idle' : prev), 2000);
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [rows, onSimpan]);

  const addRow = () => {
    const newRow = config.columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {});
    setRows([...rows, { id: Date.now().toString(), ...newRow }]);
  };

  const removeRow = (idToRemove) => {
    setRows(rows.filter(row => row.id !== idToRemove));
  };

  const updateRow = (id, key, value) => {
    setRows(rows.map(row => row.id === id ? { ...row, [key]: value } : row));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <span>{config.icon}</span> {config.title}
        </h3>
        {status === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        {status === 'saved' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-start gap-2 border border-red-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-sm text-slate-500 mb-3">Belum ada entri {config.title.toLowerCase()}.</p>
          <button onClick={addRow} className="btn-secondary text-sm py-1.5 px-3 rounded-lg">
            <Plus className="h-4 w-4" /> Tambah Baris
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.id} className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-4 pt-8 group">
              <span className="absolute top-2 left-3 text-xs font-bold text-slate-400">#{index + 1}</span>
              <button 
                onClick={() => removeRow(row.id)}
                className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 p-1.5 rounded-lg border border-slate-200 transition-colors"
                title="Hapus baris ini"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.columns.map(col => (
                  <div key={col.key} className={col.type === 'textarea' || col.type === 'url' ? 'md:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      {col.label}
                    </label>
                    {col.type === 'textarea' ? (
                      <textarea
                        value={row[col.key] || ''}
                        onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                        className="input min-h-[80px] text-sm"
                        placeholder={`Masukkan ${col.label.toLowerCase()}...`}
                      />
                    ) : (
                      <div className="relative">
                        {col.type === 'url' && (
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <LinkIcon className="h-4 w-4" />
                          </div>
                        )}
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={row[col.key] || ''}
                          onChange={(e) => updateRow(row.id, col.key, e.target.value)}
                          className={`input text-sm ${col.type === 'url' ? 'pl-9' : ''}`}
                          placeholder={col.type === 'url' ? 'https://drive.google.com/...' : `Masukkan ${col.label.toLowerCase()}...`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={addRow} className="btn-secondary text-sm py-2 px-4 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border-none shadow-none">
              <Plus className="h-4 w-4" /> Tambah Baris {config.title}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

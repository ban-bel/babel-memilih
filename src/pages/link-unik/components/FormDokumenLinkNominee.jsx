import { useState, useEffect, useRef } from 'react';
import { Link as LinkIcon, CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';
import GoogleDriveViewer from '../../../components/common/GoogleDriveViewer';

export default function FormDokumenLinkNominee({ linkTersimpan, onSimpan }) {
  const [teks, setTeks] = useState(linkTersimpan ?? '');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const hasChangesRef = useRef(false);

  useEffect(() => {
    setTeks(linkTersimpan ?? '');
    hasChangesRef.current = false;
    setStatus('idle');
  }, [linkTersimpan]);

  const isValidUrl = (url) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  useEffect(() => {
    if (!hasChangesRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (!teks.trim() && !linkTersimpan) {
        setStatus('idle');
        return;
      }

      if (teks.trim() && !isValidUrl(teks)) {
        setStatus('error');
        setError('Link harus diawali dengan http:// atau https://');
        return;
      }

      setStatus('saving');
      setError(null);

      try {
        await onSimpan(teks.trim());
        setStatus('saved');
        hasChangesRef.current = false;

        setTimeout(() => {
          setStatus((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    }, 900);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [teks, onSimpan, linkTersimpan]);

  function handleChange(e) {
    setTeks(e.target.value);
    hasChangesRef.current = true;
    setStatus('idle');
    if (error) setError(null);
  }

  const sudahTerisi = Boolean(teks.trim() || linkTersimpan);
  const isValid = isValidUrl(teks);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:shadow-soft-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <LinkIcon className="h-4 w-4" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium leading-relaxed text-slate-800">
            Link Google Drive (PDF Dokumen)
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Masukkan tautan (link) Google Drive dokumen pendukung/profil Anda di sini. 
            Pastikan hak akses link diatur ke "Anyone with the link can view" atau "Siapa saja yang memiliki link".
          </p>
        </div>

        <div className="shrink-0">
          {sudahTerisi && isValid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Tersimpan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              <Clock className="h-3 w-3" />
              Opsional
            </span>
          )}
        </div>
      </div>

      {isValid && teks && (
        <GoogleDriveViewer url={teks} title="Pratinjau Dokumen" className="mt-4" />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <input
        type="url"
        value={teks}
        onChange={handleChange}
        placeholder="https://drive.google.com/file/d/..."
        className="input w-full text-sm"
      />

      <div className="flex items-center gap-2 text-xs text-slate-500">
        {status === 'saving' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Menyimpan...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-600">Tersimpan</span>
          </>
        )}
        {status === 'idle' && sudahTerisi && isValid && !hasChangesRef.current && (
          <span className="text-slate-400">Tersimpan otomatis</span>
        )}
      </div>
    </div>
  );
}

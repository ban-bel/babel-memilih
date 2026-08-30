import React, { useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

export default function GoogleDriveViewer({ url, title = "Dokumen", className = "" }) {
  const [iframeError, setIframeError] = useState(false);

  if (!url) return null;

  // Fungsi pintar untuk mengekstrak ID dan membuat URL preview
  const getEmbedUrl = (link) => {
    try {
      let id = null;
      let type = 'file'; // default drive file
      
      // Deteksi pola Docs, Sheets, Slides, atau File biasa
      const match = link.match(/\/(file|document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[2]) {
        type = match[1];
        id = match[2];
      } else if (link.includes('id=')) {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        id = urlParams.get('id');
      }

      if (id) {
        // Jika aslinya docs/sheets/slides, kita gunakan domain docs.google.com
        if (type === 'document' || type === 'spreadsheets' || type === 'presentation') {
          return `https://docs.google.com/${type}/d/${id}/preview`;
        }
        // Jika file biasa (PDF/Gambar/Video), gunakan drive.google.com
        return `https://drive.google.com/file/d/${id}/preview`;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(url);

  // Jika bukan link drive yang bisa di-embed, tampilkan tombol standar
  if (!embedUrl) {
    return (
      <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-center ${className}`}>
        <p className="mb-3 text-sm text-slate-600">
          Tautan ini tidak dapat dipratinjau secara langsung.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
          Buka {title} di Tab Baru
        </a>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs font-semibold text-slate-600">Pratinjau {title}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          title="Buka di tab baru jika pratinjau gagal"
        >
          <ExternalLink className="h-3 w-3" />
          Buka Penuh
        </a>
      </div>
      
      <div className="relative w-full" style={{ paddingBottom: '56.25%', minHeight: '300px' }}>
        {!iframeError ? (
          <iframe
            src={embedUrl}
            className="absolute left-0 top-0 h-full w-full border-0 bg-white"
            allow="autoplay"
            onError={() => setIframeError(true)}
            title={`Pratinjau ${title}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-amber-500" />
            <p className="mb-3 text-sm font-medium text-slate-700">
              Pratinjau diblokir oleh Google Drive
            </p>
            <p className="mb-4 max-w-xs text-xs text-slate-500">
              Dokumen ini mungkin bersifat rahasia (Restricted) atau pemiliknya menonaktifkan fitur sematkan (embed).
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
              Buka Langsung
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @fileoverview Form upload bukti tunggal untuk nominee Mode 2.
 *
 * Mode 2 tidak memiliki pertanyaan narasi - nominee hanya upload
 * SATU file bukti inovasi saja. File disimpan di nominee_periode.file_url.
 *
 * @module pages/link-unik/components/FormBuktiTunggalNominee
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, XCircle, Download, RefreshCw } from 'lucide-react';
import { MAX_FILE_SIZE_MB } from '../../../utils/constants';

/**
 * Form upload bukti tunggal untuk Mode 2.
 *
 * Fitur:
 * - Drag & drop zone
 * - Preview nama file
 * - Status sudah/belum upload
 * - Download file jika sudah ada
 *
 * @component
 * @param {Object} props - Props komponen
 * @param {string|null} props.fileUrlTersimpan - Path file yang sudah tersimpan (atau null)
 * @param {Function} props.onUpload - Handler upload file
 * @param {Function} props.getSignedUrl - Function untuk dapat signed URL
 */
export default function FormBuktiTunggalNominee({
  fileUrlTersimpan,
  onUpload,
  getSignedUrl,
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  const sudahAdaFile = Boolean(fileUrlTersimpan);

  /**
   * Proses file yang dipilih/drop.
   */
  const prosesFile = useCallback((fileList) => {
    const fileItem = fileList?.[0];
    if (!fileItem) return;

    setFile(fileItem);
    setError(null);

    // Preview URL untuk tampilkan nama file
    if (fileItem.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(fileItem));
    } else {
      setPreviewUrl(null);
    }
  }, []);

  /**
   * Handle drag over.
   */
  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  /**
   * Handle drag leave.
   */
  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  /**
   * Handle drop file.
   */
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    prosesFile(e.dataTransfer.files);
  }

  /**
   * Handle click input file.
   */
  function handleClick() {
    inputRef.current?.click();
  }

  /**
   * Handle change input file.
   */
  function handleChange(e) {
    prosesFile(e.target.files);
  }

  /**
   * Upload file.
   */
  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(file);
      setFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  }

  /**
   * Download file yang sudah ada.
   */
  async function handleDownload() {
    if (!fileUrlTersimpan || !getSignedUrl) return;

    try {
      const url = await getSignedUrl(fileUrlTersimpan);
      window.open(url, '_blank');
    } catch (err) {
      setError('Gagal membuka file: ' + err.message);
    }
  }

  /**
   * Hapus preview file.
   */
  function handleBatal() {
    setFile(null);
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-navy-900">Upload Bukti Inovasi</h2>
          <p className="text-xs text-slate-500">Maksimal {MAX_FILE_SIZE_MB}MB • PDF, Word, Excel, PowerPoint</p>
        </div>
        {sudahAdaFile && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Sudah Upload
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Dropzone atau Preview */}
      {!sudahAdaFile && (
        !file ? (
          /* Dropzone */
          <div
            onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all
            ${isDragging
              ? 'border-amber-400 bg-amber-50'
              : 'border-slate-300 hover:border-navy-400 hover:bg-slate-50'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isDragging ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-slate-700">
                {isDragging ? 'Lepaskan file di sini' : 'Drag & drop file di sini'}
              </p>
              <p className="text-xs text-slate-500 mt-1">atau klik untuk pilih file</p>
            </div>
          </div>
        </div>
      ) : (
        /* Preview File */
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleBatal}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-primary flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengunggah...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload File
                </>
              )}
            </button>
            </div>
          </div>
        )
      )}

      {/* File sudah ada - Tombol Download */}
      {sudahAdaFile && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="flex-1 text-sm text-emerald-800">
              File sudah diunggah sebelumnya
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Lihat File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

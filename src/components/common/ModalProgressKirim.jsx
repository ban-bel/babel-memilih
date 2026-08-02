/**
 * @fileoverview Modal Progress Pengiriman Notifikasi WA
 *
 * Menampilkan progress real-time pengiriman bulk WhatsApp:
 * - Progress bar
 * - Counter (berhasil, gagal, sisa)
 * - Live log list
 *
 * @module components/common/ModalProgressKirim
 */

import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

/**
 * Modal Progress Kirim WA
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Apakah modal visible
 * @param {Function} props.onClose - Handler tutup modal
 * @param {Object} props.progress - Data progress
 * @param {number} props.progress.sent - Jumlah berhasil
 * @param {number} props.progress.failed - Jumlah gagal
 * @param {number} props.progress.total - Total keseluruhan
 * @param {Array} props.progress.logs - Array log items
 *
 * @example
 * <ModalProgressKirim
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   progress={{ sent: 5, failed: 1, total: 10, logs: [...] }}
 * />
 */
export default function ModalProgressKirim({ isOpen, onClose, progress }) {
  if (!isOpen) return null;

  const { sent = 0, failed = 0, total = 0, logs = [] } = progress;
  const remaining = total - sent - failed;
  const percentage = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;
  const isComplete = sent + failed >= total && total > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-soft-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Pengiriman Selesai
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-navy-600" />
                Mengirim Notifikasi WA...
              </>
            )}
          </h2>
          {isComplete && (
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Tutup
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Progress</span>
              <span className="font-mono font-semibold text-slate-700">
                {sent + failed} / {total}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-emerald-500' : 'bg-navy-700'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-center text-xs text-slate-500">{percentage}% selesai</p>
          </div>

          {/* Stats */}
          <div className="mt-4 flex justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{sent}</p>
              <p className="text-xs text-slate-500">Berhasil</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{failed}</p>
              <p className="text-xs text-slate-500">Gagal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-400">{remaining}</p>
              <p className="text-xs text-slate-500">Sisa</p>
            </div>
          </div>

          {/* Log List */}
          <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-slate-50 p-3">
            {logs.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-4">
                {isComplete ? 'Tidak ada log' : 'Memulai pengiriman...'}
              </p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded px-2 py-1.5 text-xs"
                  >
                    {log.status === 'SUCCESS' ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700 truncate">{log.nama}</p>
                      {log.error && (
                        <p className="text-red-500 truncate">{log.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          {!isComplete && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Pesan muncul di Console Browser (F12)
            </p>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="border-t border-slate-100 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-navy-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-600"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

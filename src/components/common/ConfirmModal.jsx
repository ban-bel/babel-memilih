import { AlertTriangle, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-left shadow-2xl transition-all animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 sm:h-12 sm:w-12">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <div className="mt-2 sm:mt-0">
            <h3 className="text-xl font-bold text-navy-900">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-red-700 hover:to-red-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Ya, Kirim Final
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

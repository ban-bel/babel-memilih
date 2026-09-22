import { CheckCircle } from 'lucide-react';
import Modal from './Modal';

/**
 * WelcomeModal — shared "Selamat Datang" modal for voter/penilai pages.
 * Previously duplicated identically in PenilaiPage.jsx and JuriPage.jsx.
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {string} nama - Name of the logged-in person
 * @param {string} namaPeriode - Name of the voting period
 * @param {string} [buttonLabel] - Label for the confirm button (default: "Mulai Menilai")
 */
export default function WelcomeModal({ isOpen, onClose, nama, namaPeriode, buttonLabel = 'Mulai Menilai' }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Penilaian"
    >
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-xl font-bold text-navy-900">Selamat Datang, {nama}!</h4>
          <p className="mt-2 text-slate-600">
            Anda telah berhasil masuk ke sistem penilaian.
          </p>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <p className="text-sm text-amber-900 font-semibold mb-1.5 flex items-center gap-1.5">
            <span className="text-lg">⚠️</span> Cek Kembali Sesi Anda!
          </p>
          <p className="text-sm text-amber-800 mb-2">
            Pastikan Anda memasukkan data untuk periode yang <strong>BENAR</strong> (bukan link uji coba atau periode lama). Saat ini Anda berada di sesi:
          </p>
          <div className="bg-white border border-amber-200 px-3 py-2 rounded-lg text-center shadow-sm">
            <span className="font-bold text-navy-900 text-sm">{namaPeriode}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-5 bg-navy-600 hover:bg-navy-700 text-white rounded-xl font-medium transition-colors"
        >
          Ya, Periode Sudah Benar ({buttonLabel})
        </button>
      </div>
    </Modal>
  );
}

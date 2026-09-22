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
            Pada pemilihan <span className="font-semibold text-navy-800">{namaPeriode}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 px-5 bg-navy-600 hover:bg-navy-700 text-white rounded-xl font-medium transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
    </Modal>
  );
}

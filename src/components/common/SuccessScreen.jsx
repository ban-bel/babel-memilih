import { CheckCircle2 } from 'lucide-react';

export default function SuccessScreen({ nama, namaPeriode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-paper to-slate-100 px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-8 text-center shadow-soft-xl animate-fade-in-up">
        {/* Decorative background */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gold-100/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-navy-100/40 blur-3xl" />
        
        <div className="relative">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          
          <h1 className="mb-4 font-display text-3xl font-bold text-navy-900">
            Sukses!
          </h1>
          
          <p className="text-base leading-relaxed text-slate-600">
            Terima kasih atas partisipasi <strong className="text-navy-800">{nama}</strong> pada penilaian <strong className="text-navy-800">{namaPeriode}</strong>.
          </p>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-sm text-slate-500 italic">
              "Sampai ketemu di penilaian berikutnya."
            </p>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Anda sudah bisa menutup halaman ini.
          </p>
        </div>
      </div>
    </div>
  );
}

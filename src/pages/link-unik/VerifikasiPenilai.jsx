/**
 * @fileoverview Halaman Verifikasi Identitas untuk Penilai.
 *
 * User mengakses /penilai, input 5 digit NIP + 5 digit HP,
 * lalu akan ditampilkan daftar periode yang bisa diakses.
 *
 * @module pages/link-unik/VerifikasiPenilai
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Loader2, ClipboardList, Clock, CheckCircle, Fingerprint, Smartphone } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { verifikasiIdentitasPenilai } from '../../services/votingService';
import { getDailyAvatarUrl } from '../../utils/constants';

/**
 * Format tanggal Indonesia
 */
function formatTanggalIndonesia(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function VerifikasiPenilai() {
  const navigate = useNavigate();
  const girlAvatarSrc = getDailyAvatarUrl('girl');
  const boyAvatarSrc = getDailyAvatarUrl('boy');
  const [nip5digit, setNip5digit] = useState('');
  const [hp5digit, setHp5digit] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Mutation untuk verifikasi
  const mutasiVerifikasi = useMutation({
    mutationFn: () => verifikasiIdentitasPenilai(nip5digit, hp5digit),
    onSuccess: (data) => {
      setSuccess(data);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  // Handle input change - hanya angka
  const handleNipChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setNip5digit(value);
  };

  const handleHpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setHp5digit(value);
  };

  // Handle submit
  const handleVerifikasi = (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    mutasiVerifikasi.mutate();
  };

  // Handle redirect button - masuk ke periode tertentu
  const handleMasukPeriode = (token) => {
    if (token) {
      navigate(`/penilai/${token}`);
    }
  };

  // Handle reset / verifikasi ulang
  const handleReset = () => {
    setSuccess(null);
    setError(null);
    setNip5digit('');
    setHp5digit('');
  };

  const isLoading = mutasiVerifikasi.isPending;
  const isValid = nip5digit.length === 5 && hp5digit.length === 5;
  const periodeList = success?.periode_list || [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-paper via-slate-50 to-slate-200 flex items-center justify-center p-4 sm:p-8">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-navy-200/40 to-blue-300/20 blur-[100px] mix-blend-multiply animate-pulse-soft" />
        <div className="absolute top-[60%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-200/30 to-teal-300/20 blur-[120px] mix-blend-multiply animate-float" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiLz48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-30" />
      </div>

      {/* Floating Avatar Left */}
      <div className="absolute top-1/2 -translate-y-[35%] z-0 pointer-events-none left-1/2 -translate-x-[80%] opacity-20 lg:left-auto lg:right-1/2 lg:translate-x-0 lg:mr-[270px] xl:mr-[320px] lg:opacity-100">
        <img 
          src={girlAvatarSrc} 
          alt="Pegawai Perempuan" 
          className="h-[400px] lg:h-[500px] xl:h-[620px] w-auto drop-shadow-2xl animate-float" 
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Floating Avatar Right */}
      <div className="absolute top-1/2 -translate-y-[35%] z-0 pointer-events-none right-1/2 translate-x-[80%] opacity-20 lg:right-auto lg:left-1/2 lg:translate-x-0 lg:ml-[270px] xl:ml-[320px] lg:opacity-100">
        <img 
          src={boyAvatarSrc} 
          alt="Pegawai Laki-laki" 
          className="h-[400px] lg:h-[500px] xl:h-[620px] w-auto drop-shadow-2xl animate-float" 
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <div className="relative w-full max-w-lg animate-fade-in-up z-10">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
            <div className="absolute inset-0 bg-gradient-to-tr from-navy-600 to-navy-800 rounded-2xl shadow-glow rotate-3 animate-wiggle opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-bl from-navy-700 to-navy-900 rounded-2xl -rotate-3" />
            <ShieldCheck className="relative w-10 h-10 text-gold-400 drop-shadow-md z-10" />
          </div>
          <h1 className="text-3xl font-display font-bold text-navy-900 tracking-tight">Verifikasi Akses</h1>
          <p className="text-slate-500 mt-2 font-medium">Sistem Penilaian Pegawai</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-soft-xl border border-white/50 overflow-hidden relative">
          
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-navy-400 via-emerald-400 to-navy-600 opacity-90" />

          {/* Form Section - hanya tampil jika belum sukses */}
          {!success && (
            <div className="p-8">
              <div className="mb-6">
                <p className="text-sm text-slate-600 text-center bg-slate-100/50 rounded-lg p-3 border border-slate-200/50 shadow-inner-soft">
                  Masukkan <strong>5 digit terakhir NIP Lamamu </strong> & <strong>5 digit terakhir Nomor HP </strong> Anda yang terdaftar pada sistem.
                </p>
              </div>

              <form onSubmit={handleVerifikasi} className="space-y-5">
                {/* NIP Input */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-navy-800 mb-2 transition-colors group-focus-within:text-navy-600">
                    <Fingerprint className="w-4 h-4" />
                    5 Digit Terakhir NIP Lama Anda
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={nip5digit}
                      onChange={handleNipChange}
                      placeholder="Contoh: 12345"
                      className="w-full px-5 py-4 text-center text-3xl font-mono tracking-[0.3em] text-navy-900
                               bg-white/50 border-2 border-slate-200 rounded-2xl
                               focus:outline-none focus:border-navy-500 focus:bg-white focus:shadow-glow
                               placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-lg
                               transition-all duration-300"
                      maxLength={5}
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${nip5digit.length === 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {nip5digit.length}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* HP Input */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-semibold text-navy-800 mb-2 transition-colors group-focus-within:text-navy-600">
                    <Smartphone className="w-4 h-4" />
                    5 Digit Terakhir No. HP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={hp5digit}
                      onChange={handleHpChange}
                      placeholder="Contoh: 81234"
                      className="w-full px-5 py-4 text-center text-3xl font-mono tracking-[0.3em] text-navy-900
                               bg-white/50 border-2 border-slate-200 rounded-2xl
                               focus:outline-none focus:border-navy-500 focus:bg-white focus:shadow-glow
                               placeholder:text-slate-300 placeholder:tracking-normal placeholder:text-lg
                               transition-all duration-300"
                      maxLength={5}
                      disabled={isLoading}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${hp5digit.length === 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {hp5digit.length}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!isValid || isLoading}
                    className={`
                      relative w-full py-4 px-6 rounded-2xl font-bold text-white text-lg
                      flex items-center justify-center gap-3 overflow-hidden
                      transition-all duration-300 transform
                      ${isValid && !isLoading
                        ? 'bg-gradient-to-r from-navy-700 to-navy-800 hover:from-navy-600 hover:to-navy-700 active:scale-[0.98] shadow-soft-lg hover:shadow-glow hover:-translate-y-0.5'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      }
                    `}
                  >
                    {isValid && !isLoading && (
                      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent hover:animate-shimmer" />
                    )}
                    
                    {isLoading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-6 h-6" />
                        <span>Otentikasi Akses</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* Error Message */}
          {error && !error.toLowerCase().includes('tidak ada periode') && (
            <div className="px-8 pb-8 animate-fade-in">
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                <div className="bg-red-100 p-2 rounded-xl flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-900">Verifikasi Ditolak</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full mt-4 py-3 rounded-xl text-sm text-navy-700 font-bold bg-slate-100/50 hover:bg-slate-200/50 border border-slate-200 transition-all hover:shadow-sm flex items-center justify-center gap-2"
              >
                <span>Coba Kembali</span>
              </button>
            </div>
          )}

          {/* Modal Khusus Tidak Ada Periode */}
          <Modal
            isOpen={!!error && error.toLowerCase().includes('tidak ada periode')}
            onClose={handleReset}
            title="Informasi Penilaian"
          >
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 text-amber-500 rounded-full mb-5 shadow-inner">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Belum Ada Penilaian Aktif</h4>
              <p className="text-slate-600 mb-8 px-4">
                {error}
              </p>
              <button
                onClick={handleReset}
                className="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
              >
                Mengerti
              </button>
            </div>
          </Modal>

          {/* Success: Daftar Periode */}
          {success && (
            <div className="px-8 pb-8 pt-6 space-y-6 animate-fade-in-up">
              {/* Golden Welcome Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-6 shadow-glow text-white border border-navy-700">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold-400/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-emerald-400/20 rounded-full blur-xl pointer-events-none" />
                
                <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-gradient-to-br from-gold-300 to-gold-500 p-2.5 rounded-xl flex-shrink-0 shadow-lg">
                    <CheckCircle2 className="w-7 h-7 text-navy-900" />
                  </div>
                  <div>
                    <p className="text-gold-200 text-sm font-semibold uppercase tracking-wider mb-1">Akses Diberikan</p>
                    <h2 className="text-xl font-display font-bold text-white mb-1">
                      Halo, {success.pegawai?.nama}
                    </h2>
                    <p className="text-sm text-navy-200">
                      Anda memiliki akses ke <strong className="text-gold-300">{periodeList.length}</strong> tiket penilaian.
                    </p>
                  </div>
                </div>
              </div>

              {/* Daftar Periode */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-navy-800 flex items-center gap-2 uppercase tracking-wide">
                  <ClipboardList className="w-4 h-4 text-navy-500" />
                  Tiket Penilaian Tersedia
                </h3>

                {periodeList.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center shadow-inner-soft animate-fade-in">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 text-amber-600 rounded-full mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-amber-900 mb-1">Tidak Ada Penilaian</h4>
                    <p className="text-sm text-amber-700">Saat ini tidak ada periode penilaian yang sedang berlangsung untuk Anda.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {periodeList.map((periode, index) => {
                      const sudahDigunakan = periode.status_akses === 'SUDAH_DIGUNAKAN';

                      return (
                        <div
                          key={periode.periode_id || index}
                          className={`
                            relative group overflow-hidden border-2 rounded-2xl p-5 transition-all duration-300
                            ${sudahDigunakan
                              ? 'border-slate-200 bg-slate-50/50 opacity-80'
                              : 'border-emerald-100 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-50/80 hover:shadow-soft-lg cursor-pointer'
                            }
                          `}
                          onClick={() => !sudahDigunakan && handleMasukPeriode(periode.token)}
                        >
                          {/* Status Label (If Done) */}
                          {sudahDigunakan && (
                            <div className="absolute top-0 right-0 bg-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                              Selesai
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {/* Nama Periode */}
                              <h4 className={`font-bold text-lg truncate ${sudahDigunakan ? 'text-slate-500' : 'text-navy-900 group-hover:text-emerald-800 transition-colors'}`}>
                                {periode.nama_periode}
                              </h4>

                              {/* Info Badges */}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`
                                  px-2.5 py-1 rounded-lg text-xs font-bold
                                  ${periode.mode_penilaian === 'MODE_1A' ? 'bg-blue-100 text-blue-700' :
                                    periode.mode_penilaian === 'MODE_1B' ? 'bg-purple-100 text-purple-700' :
                                    'bg-amber-100 text-amber-700'}
                                  ${sudahDigunakan ? 'opacity-60' : ''}
                                `}>
                                  {periode.mode_penilaian}
                                </span>
                                <span className={`flex items-center gap-1.5 text-xs font-medium ${sudahDigunakan ? 'text-slate-400' : 'text-slate-500'}`}>
                                  <Clock className="w-3.5 h-3.5" />
                                  Berlaku s.d. {formatTanggalIndonesia(periode.tgl_selesai)}
                                </span>
                              </div>
                            </div>

                            {/* Tombol Masuk */}
                            {!sudahDigunakan && (
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm group-hover:shadow-glow">
                                <ArrowRight className="w-5 h-5" />
                              </div>
                            )}
                            {sudahDigunakan && (
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Verifikasi Ulang */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleReset}
                  className="w-full py-3 text-sm text-navy-600 hover:text-navy-800 font-bold bg-white border-2 border-navy-100 rounded-xl hover:border-navy-300 hover:bg-navy-50 transition-all flex items-center justify-center gap-2"
                >
                  Ganti Akun Penilai
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Back Link */}
        <div className="text-center mt-8 space-y-2 animate-fade-in">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy-700 transition-colors px-4 py-2 rounded-full hover:bg-white/50"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Kembali ke Portal Utama
          </a>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} BPS Provinsi Kepulauan Bangka Belitung
          </p>
        </div>

      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UserCheck, 
  Search, 
  Sparkles, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronRight,
  HelpCircle,
  Award
} from 'lucide-react';
import { fetchPegawaiEligiblePionir } from '../../../services/voting/pionirService';
import Modal from '../../../components/common/Modal';

/**
 * Komponen Form Usulan Pionir oleh Tim Pengusul (Fase 1).
 * Pengusul memilih 1 rekan kerja, menilai 5 kriteria BerAKHLAK & Inovasi (bobot kuesioner),
 * serta memberikan 1 kata deskripsi.
 */
export default function FormPionirPengusul({
  token,
  akses,
  pertanyaan = [],
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
}) {
  const [kandidat, setKandidat] = useState(null);
  const [kataCari, setKataCari] = useState('');
  const [kataKunci, setKataKunci] = useState('');
  const [tampilModal, setTampilModal] = useState(false);

  // Pisahkan pertanyaan kuesioner (skor 1-100) dan pertanyaan kata deskripsi (jika ada di master)
  const pertanyaanSkor = useMemo(() => {
    return pertanyaan.filter((p) => (p.skor_max ?? 100) > 1);
  }, [pertanyaan]);

  // State nilai skor kuesioner per pertanyaan ID (default 85)
  const [skorState, setSkorState] = useState(() => {
    const awal = {};
    pertanyaanSkor.forEach((p) => {
      awal[p.id] = 85;
    });
    return awal;
  });

  // Query daftar rekan kerja yang boleh diusulkan
  const { data: daftarPegawai = [], isLoading: loadingPegawai } = useQuery({
    queryKey: ['pegawai-eligible-pionir', akses?.periode?.id, akses?.penilai?.id, kataCari],
    queryFn: () => fetchPegawaiEligiblePionir(akses.periode.id, akses.penilai.id, kataCari),
    enabled: Boolean(akses?.periode?.id),
  });

  function handleSliderChange(pertanyaanId, nilai) {
    setSkorState((prev) => ({
      ...prev,
      [pertanyaanId]: Number(nilai),
    }));
  }

  // Hitung rata-rata kuesioner tertimbang
  const rataRataKuesioner = useMemo(() => {
    if (pertanyaanSkor.length === 0) return 0;
    let totalBobot = 0;
    let totalPoin = 0;
    pertanyaanSkor.forEach((p) => {
      const b = Number(p.bobot) || 0.20;
      const s = Number(skorState[p.id]) || 0;
      totalPoin += s * b;
      totalBobot += b;
    });
    return totalBobot > 0 ? (totalPoin / totalBobot) : 0;
  }, [pertanyaanSkor, skorState]);

  // Validasi form
  const isFormValid = useMemo(() => {
    if (!kandidat) return false;
    if (!kataKunci.trim()) return false;
    if (pertanyaanSkor.some((p) => !skorState[p.id])) return false;
    return true;
  }, [kandidat, kataKunci, pertanyaanSkor, skorState]);

  function handleKonfirmasiSubmit() {
    if (!isFormValid) return;
    const daftarSkor = pertanyaanSkor.map((p) => ({
      pertanyaan_id: p.id,
      skor: Number(skorState[p.id]) || 80,
    }));

    onSubmit({
      kandidatId: kandidat.id,
      daftarSkor,
      kataKunci: kataKunci.trim(),
    });
  }

  // Label kategori skor
  function getPredikatSkor(nilai) {
    if (nilai >= 90) return { label: 'Sangat Baik', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (nilai >= 80) return { label: 'Baik', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (nilai >= 70) return { label: 'Cukup', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Perlu Ditingkatkan', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  }

  return (
    <div className="space-y-6">
      {/* Alert Instruksi Pengusul */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 text-white p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/10 rounded-xl shrink-0">
            <Award className="h-7 w-7 text-amber-300" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Fase 1: Masa Pengusulan Calon
            </div>
            <h2 className="text-xl font-bold">Halo, {akses?.penilai?.nama}!</h2>
            <p className="mt-1 text-sm text-slate-200 leading-relaxed">
              Sebagai Pengusul yang ditunjuk, Anda memiliki hak istimewa untuk mengusulkan <strong>1 (satu) orang rekan kerja teladan</strong> di BPS. Usulan Anda otomatis menjadi 1 suara dan kuesioner Anda berkontribusi sebesar <strong>20%</strong> dari nilai akhir calon.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Pilih Rekan Kerja */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-navy-800 text-sm font-bold">
              1
            </span>
            <h3 className="font-bold text-slate-900 text-base">Pilih Calon Pionir yang Anda Usulkan</h3>
          </div>
          {kandidat && (
            <button
              type="button"
              onClick={() => setKandidat(null)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
            >
              Ganti Pilihan
            </button>
          )}
        </div>

        {!kandidat ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama atau NIP rekan kerja yang ingin diusulkan..."
                value={kataCari}
                onChange={(e) => setKataCari(e.target.value)}
                className="input pl-10 w-full text-sm border-slate-300 focus:border-navy-600"
              />
            </div>

            <div className="text-xs text-slate-600 flex items-start gap-2 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
              <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Daftar otomatis <strong>dibatasi khusus rekan kerja di satu kantor/satuan kerja yang sama dengan Anda</strong>, serta mengecualikan diri Anda dan rekan sesama Tim Pengusul.
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
              {loadingPegawai ? (
                <div className="p-6 text-center text-sm text-slate-400">Memuat daftar rekan kerja...</div>
              ) : daftarPegawai.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  {kataCari ? 'Tidak ada rekan kerja yang cocok dengan pencarian.' : 'Ketik nama untuk mencari rekan kerja.'}
                </div>
              ) : (
                daftarPegawai.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setKandidat(p)}
                    className="flex w-full items-center justify-between p-3.5 text-left hover:bg-navy-50/70 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          p.foto_url ||
                          (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null) ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=16324a&color=fff`
                        }
                        alt={p.nama}
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=16324a&color=fff`;
                        }}
                      />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm group-hover:text-navy-900">{p.nama}</p>
                        <p className="text-xs text-slate-500">{p.jabatan || 'Pegawai'} • {p.unit_kerja}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-navy-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Pilih <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-navy-50 border border-navy-200 p-4">
            <div className="flex items-center gap-4">
              <img
                src={
                  kandidat.foto_url ||
                  (kandidat.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${kandidat.nip}.jpg` : null) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(kandidat.nama)}&background=16324a&color=fff`
                }
                alt={kandidat.nama}
                className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(kandidat.nama)}&background=16324a&color=fff`;
                }}
              />
              <div>
                <span className="inline-block px-2 py-0.5 rounded bg-navy-200 text-navy-900 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Kandidat Pilihan Anda
                </span>
                <h4 className="font-bold text-navy-900 text-base">{kandidat.nama}</h4>
                <p className="text-xs text-slate-600">{kandidat.nip_baru || kandidat.nip || '-'} • {kandidat.jabatan || 'Pegawai'}</p>
                <p className="text-xs text-navy-700 font-medium">{kandidat.unit_kerja}</p>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: Penilaian Kuesioner BerAKHLAK (5 Pilar) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-navy-800 text-sm font-bold">
              2
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Penilaian Kriteria Keteladanan & Inovasi</h3>
              <p className="text-xs text-slate-500">Berikan penilaian objektif pada skala 1 - 100 untuk rekan kerja yang diusulkan.</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">Rata-rata Kuesioner</span>
            <div className="text-lg font-bold text-navy-800">
              {rataRataKuesioner.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {pertanyaanSkor.map((p, idx) => {
            const skor = skorState[p.id] ?? 85;
            const predikat = getPredikatSkor(skor);
            const bobotPersen = Math.round((Number(p.bobot) || 0.20) * 100);

            return (
              <div key={p.id} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        Kriteria {idx + 1}
                      </span>
                      <span className="text-[11px] font-semibold text-navy-700 bg-navy-50 border border-navy-200 px-2 py-0.5 rounded">
                        Bobot {bobotPersen}%
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 leading-snug">{p.teks_pertanyaan}</p>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-xl font-extrabold text-navy-900">{skor}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${predikat.color}`}>
                      {predikat.label}
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min={p.skor_min ?? 1}
                    max={p.skor_max ?? 100}
                    value={skor}
                    onChange={(e) => handleSliderChange(p.id, e.target.value)}
                    className="w-full accent-navy-700 h-2 bg-slate-200 rounded-lg cursor-pointer transition-all"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>1 (Sangat Kurang)</span>
                    <span>50 (Cukup)</span>
                    <span>75 (Baik)</span>
                    <span>100 (Istimewa)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: 1 Kata Deskripsi Calon Pionir */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-navy-800 text-sm font-bold">
            3
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">1 Kata untuk Calon Pionir</h3>
            <p className="text-xs text-slate-500">Tuliskan 1 (satu) kata yang paling mencerminkan keteladanan rekan kerja ini.</p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="relative">
            <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
            <input
              type="text"
              maxLength={30}
              placeholder="Contoh: Inspiratif, Solutif, Disiplin, Cekatan, Tangguh..."
              value={kataKunci}
              onChange={(e) => setKataKunci(e.target.value)}
              className="input pl-10 w-full text-sm border-slate-300 focus:border-navy-600 font-medium"
            />
          </div>
          <p className="text-xs text-slate-400">
            Kata ini akan ditampilkan sebagai testimoni pada kartu kandidat saat voting umum dan di word cloud dashboard.
          </p>
        </div>
      </div>

      {/* Tombol Submit */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!isFormValid || isSubmitting}
          onClick={() => setTampilModal(true)}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all ${
            isFormValid && !isSubmitting
              ? 'bg-navy-700 hover:bg-navy-800 cursor-pointer shadow-navy-700/20'
              : 'bg-slate-300 cursor-not-allowed text-slate-500'
          }`}
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Mengirim Usulan...' : 'Kirim Usulan & Penilaian'}
        </button>
      </div>

      {/* Modal Konfirmasi Submit */}
      <Modal
        isOpen={tampilModal}
        onClose={() => setTampilModal(false)}
        title="Konfirmasi Pengusulan Pionir"
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-navy-200 bg-navy-50/60 p-4 space-y-3">
            <p className="text-xs text-navy-800 font-medium">
              Mohon pastikan seluruh data usulan Anda telah sesuai:
            </p>
            <div className="flex items-center gap-3 border-t border-navy-200/60 pt-3">
              <img
                src={
                  kandidat?.foto_url ||
                  (kandidat?.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${kandidat.nip}.jpg` : null) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(kandidat?.nama || 'P')}&background=16324a&color=fff`
                }
                alt={kandidat?.nama}
                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
              />
              <div>
                <p className="font-bold text-navy-900 text-sm">{kandidat?.nama}</p>
                <p className="text-xs text-slate-600">{kandidat?.jabatan} • {kandidat?.unit_kerja}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Rata-rata Kuesioner</span>
                <span className="font-bold text-navy-900 text-sm">{rataRataKuesioner.toFixed(1)} / 100</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-slate-500 block">Kata Deskripsi</span>
                <span className="font-bold text-emerald-700 text-sm">"{kataKunci.trim()}"</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <p>
              Setelah dikirimkan, usulan dan penilaian tidak dapat diubah kembali. Rekan kerja yang Anda usulkan akan otomatis menjadi kandidat resmi pada Fase 2 (Voting Umum).
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setTampilModal(false)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Periksa Kembali
            </button>
            <button
              type="button"
              onClick={() => {
                setTampilModal(false);
                handleKonfirmasiSubmit();
              }}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-navy-700 hover:bg-navy-800 text-sm font-semibold text-white shadow-md transition-colors inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Mengirim...' : 'Ya, Kirim Usulan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

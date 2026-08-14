import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, CheckCircle2, Loader2, PartyPopper, FileText, ListChecks, Award } from 'lucide-react';
import Select from 'react-select';

import {
  fetchWilayahList,
  buatPeriodePenilaian,
  simpanPertanyaanMode1A,
  simpanKategoriMode2,
  simpanVotingKategori,
  simpanKriteriaMode2A,
  tugaskanJuriMode2,
  generateTokenPenilaianMultiUnit,
  simpanUnitKerjaPeriode,
} from '../../services/adminService';
import { MODE_PENILAIAN, MODE_PENILAIAN_LABEL } from '../../utils/constants';

import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';
import FormPertanyaanBuilder, { buatBarisPertanyaan } from './components/FormPertanyaanBuilder';
import FormKategoriBuilder, { buatBarisKategori } from './components/FormKategoriBuilder';
import FormKriteriaBuilder, { buatBarisKriteria } from './components/FormKriteriaBuilder';
import FormPenunjukanJuri from './components/FormPenunjukanJuri';
import FormVotingKategoriBuilder, { buatBarisKategoriVoting } from './components/FormVotingKategoriBuilder';

const LANGKAH = [
  { label: 'Info Periode', icon: FileText },
  { label: 'Mode & Konten', icon: ListChecks },
  { label: 'Review', icon: Award },
];

const STEP_ICONS = [FileText, ListChecks, Award];

function nilaiAwalForm() {
  return {
    nama_periode: '',
    wilayah_id: '',
    wilayah_ids: [],
    tgl_mulai: '',
    tgl_selesai: '',
    petunjuk_penilaian: '',
    mode_penilaian: MODE_PENILAIAN.MODE_1A,
    max_nominee: 10,
    pertanyaan: [buatBarisPertanyaan()],
    kategori: [buatBarisKategori()],
    kriteria: [buatBarisKriteria()],
    isVotingKategoriEnabled: false,
    votingKategori: [buatBarisKategoriVoting()],
    is_voting_selesai: false,
    juri: [],
    is_video_profil: false,
    is_nominee_can_vote: true,
    is_allow_abstain: false,
  };
}

export function BuatPeriodeWizard({ adminProfile, onSuccess }) {
  const [langkah, setLangkah] = useState(0);
  const [form, setForm] = useState(nilaiAwalForm());
  const [hasilAkhir, setHasilAkhir] = useState(null);
  const [errorSubmit, setErrorSubmit] = useState(null);

  const isKabKotaAdmin = adminProfile?.role_admin === 'ADMIN_KABKOTA';
  const isProvinsiAdmin = adminProfile?.role_admin === 'ADMIN_PROVINSI';

  const { data: wilayahList = [] } = useQuery({ queryKey: ['wilayah-list'], queryFn: fetchWilayahList });

  const wilayahOptions = wilayahList.filter((w) => {
    if (isKabKotaAdmin) return w.id === Number(adminProfile?.wilayah_id);
    if (isProvinsiAdmin) {
      return w.id === Number(adminProfile?.wilayah_id) || w.parent_id === Number(adminProfile?.wilayah_id);
    }
    return true;
  });

  useEffect(() => {
    if (isKabKotaAdmin && adminProfile?.wilayah_id && !form.wilayah_id) {
      ubah('wilayah_id', Number(adminProfile.wilayah_id));
      ubah('wilayah_ids', [Number(adminProfile.wilayah_id)]);
    }
  }, [isKabKotaAdmin, adminProfile]);

  function ubah(field, nilai) {
    setForm((prev) => ({ ...prev, [field]: nilai }));
  }

  const totalBobotKategori = form.kategori.reduce((s, k) => s + (Number(k.bobot_persen) || 0), 0);
  const isTanggalValid = form.tgl_mulai && form.tgl_selesai && form.tgl_selesai > form.tgl_mulai;

  const langkah1Valid = Boolean(
    form.nama_periode &&
    form.wilayah_ids?.length > 0 &&
    form.tgl_mulai &&
    form.tgl_selesai &&
    isTanggalValid
  );

  const langkah2Valid =
    form.mode_penilaian === MODE_PENILAIAN.MODE_1A
      ? form.pertanyaan.length > 0 && form.pertanyaan.every((p) => p.teks_pertanyaan.trim())
      : form.mode_penilaian === MODE_PENILAIAN.MODE_1B
        ? !form.isVotingKategoriEnabled || (form.votingKategori.length > 0 && form.votingKategori.every((k) => k.nama_kategori.trim()))
        : form.mode_penilaian === MODE_PENILAIAN.MODE_2A
          ? form.kriteria.length > 0 && form.kriteria.every((k) => k.nama_kriteria.trim())
          : form.kategori.length > 0 &&
            form.kategori.every((k) => k.nama_kategori.trim()) &&
            totalBobotKategori === 100 &&
            form.juri.length > 0 &&
            form.juri.some((j) => j.is_ketua_juri);

  const mutasiBuatPeriode = useMutation({
    mutationFn: async () => {
      const periodeId = await buatPeriodePenilaian({
        ...form,
        created_by: adminProfile.id,
        wilayah_id: form.wilayah_id || form.wilayah_ids[0]
      });

      await simpanUnitKerjaPeriode(periodeId, form.wilayah_ids);

      if (form.mode_penilaian === MODE_PENILAIAN.MODE_1A) {
        await simpanPertanyaanMode1A(periodeId, form.pertanyaan);
      } else if (form.mode_penilaian === MODE_PENILAIAN.MODE_1B && form.isVotingKategoriEnabled) {
        await simpanVotingKategori(periodeId, form.votingKategori);
      } else if (form.mode_penilaian === MODE_PENILAIAN.MODE_2A) {
        await simpanKriteriaMode2A(periodeId, form.kriteria);
      } else if (form.mode_penilaian === MODE_PENILAIAN.MODE_2) {
        await simpanPertanyaanMode1A(periodeId, form.pertanyaan);
        await simpanKategoriMode2(periodeId, form.kategori);
        await tugaskanJuriMode2(periodeId, form.juri);
      }

      let jumlahToken = null;
      if (form.mode_penilaian !== MODE_PENILAIAN.MODE_2) {
        jumlahToken = await generateTokenPenilaianMultiUnit(periodeId, form.wilayah_ids);
      }

      return { periodeId, jumlahToken };
    },
    onSuccess: (hasil) => setHasilAkhir(hasil),
    onError: (err) => setErrorSubmit(err.message),
  });

  if (hasilAkhir) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-fade-in-up bg-white/80 backdrop-blur-xl border border-white/60 shadow-soft-xl rounded-[2rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-gold-400 to-gold-600 shadow-glow-gold relative z-10">
            <PartyPopper className="h-12 w-12 text-white animate-bounce-soft" />
          </div>
          <h1 className="font-display text-3xl font-bold text-navy-900 tracking-tight mb-2 relative z-10">Selesai!</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium relative z-10">
            {form.mode_penilaian === MODE_PENILAIAN.MODE_2
              ? `${form.juri.length} juri telah berhasil ditugaskan.`
              : `${hasilAkhir.jumlahToken ?? 0} tiket otentikasi unik berhasil dicetak.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setForm(nilaiAwalForm());
              setLangkah(0);
              setHasilAkhir(null);
            }}
            className="btn-primary w-full mt-8 shadow-lg hover:-translate-y-0.5 relative z-10"
          >
            Buat Periode Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
        {LANGKAH.map((step, idx) => {
          const StepIcon = STEP_ICONS[idx];
          const isCompleted = idx < langkah;
          const isActive = idx === langkah;
          return (
            <div key={step.label} className="flex items-center gap-3 sm:gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-br from-navy-600 to-navy-800 text-white shadow-soft-lg scale-110 shadow-navy-900/20 border border-navy-500'
                    : isCompleted
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-md'
                      : 'bg-white/60 backdrop-blur-md text-slate-400 border border-white/50 shadow-sm'
                }`}>
                  {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <StepIcon className="h-5 w-5" />}
                </div>
                <span className={`hidden text-[11px] font-bold tracking-widest uppercase sm:block ${isActive ? 'text-navy-900' : isCompleted ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < LANGKAH.length - 1 && (
                <div className={`h-1 rounded-full w-8 sm:w-20 mb-6 transition-colors duration-300 ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200/60'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Card */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-soft-xl rounded-[2rem] overflow-hidden relative">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-navy-400 via-emerald-400 to-navy-600 opacity-90" />

        <div className="bg-gradient-to-br from-navy-50/50 to-transparent border-b border-white/50 p-6 sm:px-8 sm:py-6">
          <h3 className="font-display text-xl font-bold text-navy-900 tracking-tight">{LANGKAH[langkah].label}</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Langkah {langkah + 1} dari {LANGKAH.length}</p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {errorSubmit && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur-sm p-4 text-sm font-medium text-red-700 flex items-start gap-3 animate-shake">
              <div className="bg-red-100 p-1.5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-0.5">{errorSubmit}</p>
            </div>
          )}

          {/* Step 1: Info Dasar */}
          {langkah === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Periode</label>
                <input type="text" value={form.nama_periode} onChange={(e) => ubah('nama_periode', e.target.value)} placeholder="mis. Pemilihan Pegawai Teladan 2026" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Unit Kerja{adminProfile?.role_admin === 'ADMIN_PROVINSI' || adminProfile?.role_admin === 'SUPER_ADMIN' ? ' (bisa pilih banyak)' : ''}
                </label>
                <Select
                  isMulti
                  isDisabled={isKabKotaAdmin}
                  options={wilayahOptions.map((w) => ({
                    value: w.id,
                    label: `${w.nama_unit_kerja || w.nama_wilayah}${w.kode_wilayah ? ` (${w.kode_wilayah})` : ''}`,
                    level: w.level,
                  }))}
                  value={
                    (form.wilayah_ids || [])
                      .map((id) => {
                        const w = wilayahOptions.find((opt) => opt.id === id);
                        return w ? { value: w.id, label: `${w.nama_unit_kerja || w.nama_wilayah}${w.kode_wilayah ? ` (${w.kode_wilayah})` : ''}`, level: w.level } : null;
                      })
                      .filter(Boolean)
                  }
                  onChange={(selected) => {
                    const ids = selected.map((s) => s.value);
                    ubah('wilayah_ids', ids);
                    if (selected.length > 0 && !form.wilayah_id) {
                      const firstSelected = wilayahOptions.find((w) => w.id === selected[0].value);
                      ubah('wilayah_id', firstSelected?.parent_id || firstSelected?.id);
                    }
                  }}
                  placeholder={isKabKotaAdmin ? '1 unit kerja (otomatis)' : 'Pilih unit kerja...'}
                  className="text-sm"
                />
                {form.wilayah_ids?.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">✓ {form.wilayah_ids.length} unit kerja dipilih</p>
                )}
                {(!form.wilayah_ids || form.wilayah_ids.length === 0) && (
                  <p className="text-xs text-red-500 mt-2">Wajib pilih minimal 1 unit kerja</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Mulai</label>
                  <input type="datetime-local" value={form.tgl_mulai} onChange={(e) => ubah('tgl_mulai', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Selesai</label>
                  <input type="datetime-local" value={form.tgl_selesai} onChange={(e) => ubah('tgl_selesai', e.target.value)} className="input" />
                </div>
              </div>
              {form.tgl_mulai && form.tgl_selesai && !isTanggalValid && (
                <p className="text-xs text-red-500 -mt-2">⚠️ Tanggal selesai harus setelah tanggal mulai</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Petunjuk (opsional)</label>
                <textarea rows={3} value={form.petunjuk_penilaian} onChange={(e) => ubah('petunjuk_penilaian', e.target.value)} className="input resize-none" />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Nominee Berhak Voting</label>
                  <p className="text-xs text-slate-500">Jika aktif, nominee akan otomatis di-generate sebagai Penilai (diberi hak pilih).</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" checked={form.is_nominee_can_vote} onChange={(e) => ubah('is_nominee_can_vote', e.target.checked)} />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-navy-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300"></div>
                </label>
              </div>

              {/* Toggle Abstain */}
              {(form.mode_penilaian === MODE_PENILAIAN.MODE_1B || form.mode_penilaian === MODE_PENILAIAN.MODE_1A) && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <h4 className="font-semibold text-slate-800">Izinkan Suara Abstain / Kotak Kosong</h4>
                    <p className="text-xs text-slate-500">Penilai diperbolehkan untuk memilih opsi Abstain (suara tidak sah) tanpa menunjuk kandidat mana pun.</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" checked={form.is_allow_abstain} onChange={(e) => ubah('is_allow_abstain', e.target.checked)} />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-navy-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy-300"></div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Mode & Konten */}
          {langkah === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mode Penilaian</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {Object.values(MODE_PENILAIAN).map((mode) => (
                    <label key={mode} className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${form.mode_penilaian === mode ? 'border-navy-800 bg-navy-50' : 'border-slate-200 hover:border-navy-300'}`}>
                      <input type="radio" name="mode_penilaian" value={mode} checked={form.mode_penilaian === mode} onChange={(e) => ubah('mode_penilaian', e.target.value)} className="sr-only" />
                      <span className="font-semibold text-slate-800">{MODE_PENILAIAN_LABEL[mode]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(form.mode_penilaian === MODE_PENILAIAN.MODE_1A || form.mode_penilaian === MODE_PENILAIAN.MODE_2) && (
                <div className="rounded-xl border border-navy-200 bg-white p-4 mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Maksimal Jumlah Nominee</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_nominee}
                    onChange={(e) => ubah('max_nominee', parseInt(e.target.value) || 10)}
                    className="input w-full sm:w-1/3"
                  />
                  <p className="text-xs text-slate-500 mt-1">Batas jumlah pegawai yang dapat ditambahkan sebagai nominee.</p>
                </div>
              )}

              {(form.mode_penilaian === MODE_PENILAIAN.MODE_1A || form.mode_penilaian === MODE_PENILAIAN.MODE_2) && (
                <div className="rounded-xl border border-navy-200 bg-navy-50/30 p-4 mb-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_video_profil}
                      onChange={(e) => ubah('is_video_profil', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                    />
                    <div>
                      <span className="font-medium text-navy-900">Minta Link Video Profil (YouTube)</span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Jika diaktifkan, nominee wajib menyertakan link video YouTube (misal: youtube.com atau youtu.be).
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {(form.mode_penilaian === MODE_PENILAIAN.MODE_1A || form.mode_penilaian === MODE_PENILAIAN.MODE_2) && (
                <FormPertanyaanBuilder daftar={form.pertanyaan} onChange={(d) => ubah('pertanyaan', d)} />
              )}

              {form.mode_penilaian === MODE_PENILAIAN.MODE_2 && (
                <>
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
                    <strong>Catatan:</strong> Pertanyaan di bawah untuk narasi Nominee.
                  </div>
                  <FormKategoriBuilder daftar={form.kategori} onChange={(d) => ubah('kategori', d)} />
                  <FormPenunjukanJuri wilayahIds={form.wilayah_ids} daftar={form.juri} onChange={(d) => ubah('juri', d)} />
                </>
              )}

              {form.mode_penilaian === MODE_PENILAIAN.MODE_2A && (
                <>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                    <strong>MODE_2A:</strong> Penilai memilih 1 nominee favorit dan memberikan skor penilaian per kriteria.
                  </div>
                  <FormKriteriaBuilder daftar={form.kriteria} onChange={(d) => ubah('kriteria', d)} />
                </>
              )}

              {form.mode_penilaian === MODE_PENILAIAN.MODE_1B && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-navy-200 bg-navy-50/30 p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isVotingKategoriEnabled}
                        onChange={(e) => ubah('isVotingKategoriEnabled', e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500"
                      />
                      <div>
                        <span className="font-medium text-navy-900">Aktifkan Kategori Voting</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {form.isVotingKategoriEnabled
                            ? 'Voter akan vote per kategori. Wajib vote semua kategori.'
                            : 'Voting flat — voter pilih 1 nominee langsung tanpa kategori.'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {form.isVotingKategoriEnabled && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-sm text-slate-600 mb-3">
                        Tambahkan kategori voting. Voter akan vote di setiap kategori yang dibuat.
                      </p>
                      <FormVotingKategoriBuilder
                        daftar={form.votingKategori}
                        onChange={(d) => ubah('votingKategori', d)}
                      />
                    </div>
                  )}

                  {!form.isVotingKategoriEnabled && (
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                      Voting flat — voter memilih 1 nominee langsung tanpa melalui kategori.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {langkah === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Nama</span>
                  <span className="font-semibold text-slate-800">{form.nama_periode}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Mode</span>
                  <span className="font-semibold text-slate-800">{MODE_PENILAIAN_LABEL[form.mode_penilaian]}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-semibold text-slate-800">{form.tgl_mulai} — {form.tgl_selesai}</span>
                </div>
                {form.mode_penilaian === MODE_PENILAIAN.MODE_1A && (
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-500">Pertanyaan</span>
                    <span className="font-semibold text-slate-800">{form.pertanyaan.length}</span>
                  </div>
                )}
                {form.mode_penilaian === MODE_PENILAIAN.MODE_1B && (
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-500">Kategori Voting</span>
                    <span className="font-semibold text-slate-800">
                      {form.isVotingKategoriEnabled ? `${form.votingKategori.length} kategori` : 'Flat (tanpa kategori)'}
                    </span>
                  </div>
                )}
                {form.mode_penilaian === MODE_PENILAIAN.MODE_2 && (
                  <>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-500">Kategori</span>
                      <span className="font-semibold text-slate-800">{form.kategori.length} ({totalBobotKategori}%)</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Juri</span>
                      <span className="font-semibold text-slate-800">{form.juri.length}</span>
                    </div>
                  </>
                )}
                {form.mode_penilaian === MODE_PENILAIAN.MODE_2A && (
                  <div className="flex justify-between py-2 border-b border-slate-200">
                    <span className="text-slate-500">Kriteria</span>
                    <span className="font-semibold text-slate-800">{form.kriteria.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100/50 bg-white/40 backdrop-blur-md p-5 sm:px-8 sm:py-6">
          <button type="button" onClick={() => setLangkah((s) => Math.max(0, s - 1))} disabled={langkah === 0} className="btn-secondary px-6 shadow-sm hover:shadow-md transition-all">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali
          </button>

          {langkah < LANGKAH.length - 1 ? (
            <button type="button" onClick={() => setLangkah((s) => s + 1)} disabled={langkah === 0 ? !langkah1Valid : !langkah2Valid} className="btn-primary px-8 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
              Lanjut
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <button type="button" onClick={() => { setErrorSubmit(null); mutasiBuatPeriode.mutate(); }} disabled={mutasiBuatPeriode.isPending} className="btn-primary px-8 shadow-glow-gold bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 hover:-translate-y-0.5 transition-all">
              {mutasiBuatPeriode.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              {mutasiBuatPeriode.isPending ? 'Menyimpan...' : 'Buat Periode Sekarang'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuatPeriode() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <div className="max-w-2xl mx-auto py-6">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-navy-900">Buat Periode Baru</h1>
              <p className="text-sm text-slate-500 mt-1">Ikuti langkah-langkah untuk membuat periode penilaian</p>
            </div>
            <BuatPeriodeWizard />
          </div>
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

/**
 * @fileoverview Halaman pengisian nominee.
 *
 * PERUBAHAN V2 - Mode 1A vs Mode 2:
 *
 * - MODE 1A: Nominee menjawab pertanyaan NARASI (teks saja, tanpa upload file)
 *   - Auto-save debounce 900ms
 *   - Indikator Terisi/Belum
 *
 * - MODE 2: Nominee upload SATU file bukti inovasi
 *   - Dropzone drag & drop
 *   - Status sudah/belum upload
 *
 * AKSES VIA TOKEN:
 * Halaman ini diakses melalui link unik dengan format `/nominee?token=xxx`
 *
 * @module pages/link-unik/NomineePage
 */

import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

import ConfirmModal from '../../components/common/ConfirmModal';
import { fetchTokenNominee } from '../../services/voting/authService';
import { fetchPertanyaanPeriode, fetchVideoProfilNominee, submitVideoProfilNominee, fetchPortofolioNominee, submitPortofolioNominee, submitDokumenLinkNominee } from '../../services/voting/nomineeService';
import { fetchJawabanNominee, submitJawabanNominee } from '../../services/voting/jawabanService';
import { submitBuktiNomineeMode2, fetchBuktiNomineeMode2, getSignedUrlBuktiMode2 } from '../../services/voting/uploadService';
import { selesaikanPengisianNominee } from '../../services/voting/draftService';
import { getStatusAksesToken, PESAN_STATUS_AKSES } from '../../utils/statusValidator';
import { STATUS_AKSES_TOKEN, MODE_PENILAIAN } from '../../utils/constants';

import LoadingScreen from '../../components/common/LoadingScreen';
import StatusScreen from '../../components/common/StatusScreen';
import HeaderProfilAkses from '../../components/common/HeaderProfilAkses';
import SuccessScreen from '../../components/common/SuccessScreen';
import FormNarasiNominee from './components/FormNarasiNominee';
import FormBuktiTunggalNominee from './components/FormBuktiTunggalNominee';
import FormDokumenLinkNominee from './components/FormDokumenLinkNominee';
import FormVideoProfilNominee from './components/FormVideoProfilNominee';
import FormPortofolioNominee from './components/FormPortofolioNominee';

/**
 * Halaman utama nominee.
 *
 * FLOW:
 * 1. Ambil token dari URL query string
 * 2. Fetch data token dan validasi
 * 3. Hitung status akses (AKTIF, BELUM_DIBUKA, dll)
 * 4. Tampilkan form sesuai MODE:
 *    - MODE_1A: Form pertanyaan narasi
 *    - MODE_2: Form upload bukti tunggal
 * 5. User submit, token ditandai terpakai
 *
 * @component
 * @returns {JSX.Element}
 */
export default function NomineePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();

  // State lokal
  const [sudahKirim, setSudahKirim] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorAkhir, setErrorAkhir] = useState(null);

  // Fetch token nominee
  const {
    data: akses,
    isLoading: loadingToken,
    isError: tokenError,
  } = useQuery({
    queryKey: ['akses-nominee', token],
    queryFn: () => fetchTokenNominee(token),
    enabled: Boolean(token),
    retry: false,
  });

  // Hitung status akses token
  const status = !token
    ? STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID
    : tokenError
      ? STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID
      : akses
        ? getStatusAksesToken(akses.periode, akses.is_digunakan)
        : null;

  // Apakah form aktif untuk diisi
  const aktif = status === STATUS_AKSES_TOKEN.AKTIF && !sudahKirim;
  const periodeId = akses?.periode?.id;
  const nomineeId = akses?.nominee?.id;
  const modePenilaian = akses?.periode?.mode_penilaian;

  // Fetch pertanyaan untuk Mode 1A & Mode 2
  const { data: pertanyaan = [], isLoading: loadingPertanyaan } = useQuery({
    queryKey: ['pertanyaan-periode', periodeId],
    queryFn: () => fetchPertanyaanPeriode(periodeId),
    enabled: aktif && Boolean(periodeId) && (modePenilaian === MODE_PENILAIAN.MODE_1A || modePenilaian === MODE_PENILAIAN.MODE_2),
  });

  // Fetch jawaban tersimpan untuk Mode 1A & Mode 2
  const {
    data: jawaban = [],
    isLoading: loadingJawaban,
    refetch: muatUlangJawaban,
  } = useQuery({
    queryKey: ['jawaban-nominee', periodeId, nomineeId],
    queryFn: () => fetchJawabanNominee(periodeId, nomineeId),
    enabled: aktif && Boolean(periodeId) && Boolean(nomineeId) && (modePenilaian === MODE_PENILAIAN.MODE_1A || modePenilaian === MODE_PENILAIAN.MODE_2),
  });

  // Map jawaban berdasarkan pertanyaan_id
  const jawabanByPertanyaanId = Object.fromEntries((jawaban ?? []).map((j) => [j.pertanyaan_id, j]));

  // Fetch bukti file untuk Mode 2
  const {
    data: fileUrlTersimpan,
    isLoading: loadingBukti,
    refetch: muatUlangBukti,
  } = useQuery({
    queryKey: ['bukti-nominee-mode2', periodeId, nomineeId],
    queryFn: () => fetchBuktiNomineeMode2(periodeId, nomineeId),
    enabled: aktif && Boolean(periodeId) && Boolean(nomineeId) && modePenilaian === MODE_PENILAIAN.MODE_2,
  });

  // Fetch video profil link untuk Mode 1A (jika is_video_profil true)
  const {
    data: videoProfilLink,
    isLoading: loadingVideoLink,
    refetch: muatUlangVideoLink,
  } = useQuery({
    queryKey: ['video-profil-nominee', periodeId, nomineeId],
    queryFn: () => fetchVideoProfilNominee(periodeId, nomineeId),
    enabled: aktif && Boolean(periodeId) && Boolean(nomineeId) && (modePenilaian === MODE_PENILAIAN.MODE_1A || modePenilaian === MODE_PENILAIAN.MODE_2) && akses?.periode?.is_video_profil,
  });

  const {
    data: portofolio,
    isLoading: loadingPortofolio,
    refetch: muatUlangPortofolio,
  } = useQuery({
    queryKey: ['portofolio-nominee', token],
    queryFn: () => fetchPortofolioNominee(token),
    enabled: aktif && Boolean(token) && Boolean(
      akses?.periode?.is_portofolio_pengembangan ||
      akses?.periode?.is_portofolio_inovasi ||
      akses?.periode?.is_portofolio_penghargaan
    ),
  });

  // Mutation: Selesai dan kirim
  const mutasiSelesai = useMutation({
    mutationFn: () => selesaikanPengisianNominee(token),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-nominee', token] });
    },
    onError: (err) => setErrorAkhir(err.message),
  });

  const isKirimDisabledMode1A = mutasiSelesai.isPending || (akses?.periode?.is_video_profil && !videoProfilLink);
  
  // Di Mode 2, jika admin sudah menset form link (pertanyaan > 0), upload file fisik opsional/dihilangkan wajibnya.
  const isKirimDisabledMode2 = mutasiSelesai.isPending || (pertanyaan.length === 0 && !fileUrlTersimpan) || (akses?.periode?.is_video_profil && !videoProfilLink);

  // Token tidak ada
  if (!token) return <StatusScreen status={STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID} />;

  // Loading token
  if (loadingToken) return <LoadingScreen label="Memuat..." />;

  // Sudah submit
  if (sudahKirim) {
    return <SuccessScreen nama={akses.nominee.nama} namaPeriode={akses.periode.nama_periode} />;
  }

  // Status tidak aktif
  if (status !== STATUS_AKSES_TOKEN.AKTIF) {
    return <StatusScreen status={status} keterangan={PESAN_STATUS_AKSES[status]} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-paper to-slate-100/50 pb-10">
      {/* Header Profil */}
      <HeaderProfilAkses
        profil={akses.nominee}
        modePenilaian={modePenilaian}
        namaPeriode={akses.periode.nama_periode}
      />

      <main className="mx-auto mt-6 w-full max-w-2xl space-y-4 px-4">
        {/* Petunjuk Penilaian */}
        {akses.periode.petunjuk_penilaian && (
          <div className="rounded-xl border border-navy-200/50 bg-navy-50/50 p-4 text-sm text-navy-800">
            {akses.periode.petunjuk_penilaian}
          </div>
        )}

        {/* Error Message */}
        {errorAkhir && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            {errorAkhir}
          </div>
        )}

        {/* ==================== MODE 1A: Pertanyaan Narasi ==================== */}
        {modePenilaian === MODE_PENILAIAN.MODE_1A && (
          <>
            {loadingPertanyaan || loadingJawaban || loadingVideoLink ? (
              <LoadingScreen label="Memuat..." />
            ) : pertanyaan.length === 0 && !akses.periode.is_video_profil ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                Belum ada pertanyaan atau form untuk periode ini.
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Form Video Profil (jika diwajibkan) */}
                  {akses.periode.is_video_profil && (
                    <FormVideoProfilNominee
                      linkTersimpan={videoProfilLink}
                      onSimpan={async (link) => {
                        await submitVideoProfilNominee(token, link);
                        await muatUlangVideoLink();
                      }}
                    />
                  )}

                  {/* Daftar Pertanyaan Narasi */}
                  {pertanyaan.map((p) => (
                    <FormNarasiNominee
                      key={p.id}
                      pertanyaan={p}
                      jawabanTersimpan={jawabanByPertanyaanId[p.id]}
                      onSimpan={async (teks) => {
                        await submitJawabanNominee(token, p.id, teks);
                        await muatUlangJawaban();
                      }}
                    />
                  ))}
                  
                  {akses.periode.is_portofolio_pengembangan && (
                    <FormPortofolioNominee
                      type="portofolio_pengembangan"
                      dataTersimpan={portofolio?.portofolio_pengembangan}
                      onSimpan={async (data) => {
                        await submitPortofolioNominee(token, 'portofolio_pengembangan', data);
                        await muatUlangPortofolio();
                      }}
                    />
                  )}

                  {akses.periode.is_portofolio_inovasi && (
                    <FormPortofolioNominee
                      type="portofolio_inovasi"
                      dataTersimpan={portofolio?.portofolio_inovasi}
                      onSimpan={async (data) => {
                        await submitPortofolioNominee(token, 'portofolio_inovasi', data);
                        await muatUlangPortofolio();
                      }}
                    />
                  )}

                  {akses.periode.is_portofolio_penghargaan && (
                    <FormPortofolioNominee
                      type="portofolio_penghargaan"
                      dataTersimpan={portofolio?.portofolio_penghargaan}
                      onSimpan={async (data) => {
                        await submitPortofolioNominee(token, 'portofolio_penghargaan', data);
                        await muatUlangPortofolio();
                      }}
                    />
                  )}
                </div>

                {/* Tombol Selesai */}
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isKirimDisabledMode1A}
                  className="btn-primary w-full py-4 text-base shadow-lg disabled:opacity-50"
                >
                  {mutasiSelesai.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  Selesai & Kirim
                </button>
              </>
            )}
          </>
        )}

        {/* ==================== MODE 2: Upload Bukti Tunggal ==================== */}
        {modePenilaian === MODE_PENILAIAN.MODE_2 && (
          <>
            {loadingBukti || loadingVideoLink ? (
              <LoadingScreen label="Memuat..." />
            ) : (
              <>
                {/* 1. Form Video Profil (jika diwajibkan) */}
                {akses.periode.is_video_profil && (
                  <div className="mb-4">
                    <FormVideoProfilNominee
                      linkTersimpan={videoProfilLink}
                      onSimpan={async (link) => {
                        await submitVideoProfilNominee(token, link);
                        await muatUlangVideoLink();
                      }}
                    />
                  </div>
                )}
                
                {/* 2. Form Dokumen Utama (Google Drive / Upload Fisik) */}
                {pertanyaan.length === 0 ? (
                  <div className="space-y-4 mb-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                      <FormBuktiTunggalNominee
                        fileUrlTersimpan={fileUrlTersimpan}
                        onUpload={async (file) => {
                          await submitBuktiNomineeMode2(token, file);
                          await muatUlangBukti();
                        }}
                        getSignedUrl={getSignedUrlBuktiMode2}
                      />
                    </div>
                    <FormDokumenLinkNominee
                      linkTersimpan={akses.nominee.dokumen_link}
                      onSimpan={async (link) => {
                        await submitDokumenLinkNominee(token, link);
                        queryClient.invalidateQueries({ queryKey: ['akses-nominee', token] });
                      }}
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <FormDokumenLinkNominee
                      linkTersimpan={akses.nominee.dokumen_link}
                      onSimpan={async (link) => {
                        await submitDokumenLinkNominee(token, link);
                        queryClient.invalidateQueries({ queryKey: ['akses-nominee', token] });
                      }}
                    />
                  </div>
                )}

                {/* 3. Daftar Pertanyaan Tambahan / Narasi Mode 2 */}
                {pertanyaan.length > 0 && (
                  <div className="space-y-4 mb-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-3">
                      <div className="mt-0.5 shrink-0 rounded-full bg-amber-100 p-1">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      </div>
                      <p>
                        <strong>PENTING:</strong> Pastikan seluruh link Google Drive yang Anda kumpulkan telah diubah aksesnya menjadi <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong>. Dewan Juri tidak dapat menilai dokumen yang terkunci (Restricted).
                      </p>
                    </div>
                    {pertanyaan.map((p) => (
                      <FormNarasiNominee
                        key={p.id}
                        pertanyaan={p}
                        jawabanTersimpan={jawabanByPertanyaanId[p.id]}
                        isDriveLinkOnly={true}
                        onSimpan={async (teks) => {
                          await submitJawabanNominee(token, p.id, teks);
                          await muatUlangJawaban();
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* 4. Portofolio */}
                <div className="space-y-4 mb-4">
                  {akses.periode.is_portofolio_pengembangan && (
                    <FormPortofolioNominee
                      type="portofolio_pengembangan"
                      dataTersimpan={portofolio?.portofolio_pengembangan}
                      onSimpan={async (data) => {
                        await submitPortofolioNominee(token, 'portofolio_pengembangan', data);
                        await muatUlangPortofolio();
                      }}
                    />
                  )}

                  {akses.periode.is_portofolio_inovasi && (
                    <FormPortofolioNominee
                      type="portofolio_inovasi"
                      dataTersimpan={portofolio?.portofolio_inovasi}
                      onSimpan={async (data) => {
                        await submitPortofolioNominee(token, 'portofolio_inovasi', data);
                        await muatUlangPortofolio();
                      }}
                    />
                  )}

                  {akses.periode.is_portofolio_penghargaan && (
                    <FormPortofolioNominee
                      type="portofolio_penghargaan"
                      dataTersimpan={portofolio?.portofolio_penghargaan}
                      onSimpan={async (data) => {
                        await submitPortofolioNominee(token, 'portofolio_penghargaan', data);
                        await muatUlangPortofolio();
                      }}
                    />
                  )}
                </div>

                {/* Tombol Selesai */}
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isKirimDisabledMode2}
                  className="btn-primary w-full py-4 text-base shadow-lg disabled:opacity-50"
                >
                  {mutasiSelesai.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  Selesai & Kirim
                </button>

                {/* Warning jika belum upload (dan tidak ada custom fields) */}
                {pertanyaan.length === 0 && !fileUrlTersimpan && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 text-center">
                    ⚠️ Harap upload bukti inovasi terlebih dahulu sebelum mengirim.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Catatan */}
        <p className="text-center text-xs text-slate-400">
          Setelah dikirim, link ini tidak bisa digunakan untuk mengubah jawaban.
        </p>
      </main>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setErrorAkhir(null);
          mutasiSelesai.mutate();
        }}
        title="Kunci & Kirim Data?"
        message="Apakah Anda yakin? Jawaban atau dokumen bukti yang sudah dikirim tidak dapat diubah kembali."
      />
    </div>
  );
}

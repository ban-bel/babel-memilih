import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CheckCircle, Info } from 'lucide-react';

import { fetchTokenPenilai } from '../../services/voting/authService';
import { fetchDaftarNominee, fetchPertanyaanMode1A } from '../../services/voting/nomineeService';
import { submitPenilaianMode1A, submitQuickVoteMode1B, submitAllVotesMode1C, fetchVotesByVoterToken, fetchKriteriaMode2A, fetchPenilaianMode2A, submitPenilaianMode2A } from '../../services/voting/penilaianService';
import { fetchAllJawabanNominee } from '../../services/voting/jawabanService';
import { fetchVotingKategori } from '../../services/voting/kategoriService';
import { submitUsulanPionir, submitVotePionir, fetchPertanyaanPionir, fetchKandidatPionir } from '../../services/voting/pionirService';
import { getStatusAksesToken, PESAN_STATUS_AKSES } from '../../utils/statusValidator';
import { STATUS_AKSES_TOKEN, MODE_PENILAIAN, getDailyAvatarUrl } from '../../utils/constants';

import LoadingScreen from '../../components/common/LoadingScreen';
import StatusScreen from '../../components/common/StatusScreen';
import HeaderProfilAkses from '../../components/common/HeaderProfilAkses';
import FormMode1A from './components/FormMode1A';
import GridMode1B from './components/GridMode1B';
import FormMode1C from './components/FormMode1C';
import FormMode2A from './components/FormMode2A';
import FormPionirPengusul from './components/FormPionirPengusul';
import GridPionirVote from './components/GridPionirVote';
import SuccessScreen from '../../components/common/SuccessScreen';
import WelcomeModal from '../../components/common/WelcomeModal';


export default function PenilaiPage() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const [sudahKirim, setSudahKirim] = useState(false);
  const [tampilModalWelcome, setTampilModalWelcome] = useState(true);
  const girlAvatarSrc = getDailyAvatarUrl('girl');
  const boyAvatarSrc = getDailyAvatarUrl('boy');

  const {
    data: akses,
    isLoading: loadingToken,
    isError: tokenError,
  } = useQuery({
    queryKey: ['akses-penilai', token],
    queryFn: () => fetchTokenPenilai(token),
    enabled: Boolean(token),
    retry: false,
  });

  const status = !token
    ? STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID
    : tokenError
      ? STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID
      : akses
        ? getStatusAksesToken(akses.periode, akses.is_digunakan)
        : null;

  const aktif = status === STATUS_AKSES_TOKEN.AKTIF && !sudahKirim;

  const { data: nominee = [], isLoading: loadingNominee } = useQuery({
    queryKey: ['daftar-nominee', akses?.periode?.id, akses?.penilai?.id],
    queryFn: () => fetchDaftarNominee(akses?.periode?.id, akses?.penilai?.id),
    enabled: aktif && Boolean(akses?.periode?.id),
  });

  const modeSaatIni = akses?.periode?.mode_penilaian;
  const { data: pertanyaan = [], isLoading: loadingPertanyaan } = useQuery({
    queryKey: ['pertanyaan-1a', akses?.periode?.id],
    queryFn: () => fetchPertanyaanMode1A(akses.periode.id),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_1A && Boolean(akses?.periode?.id),
  });

  const { data: jawabanNominee = [], isLoading: loadingJawaban } = useQuery({
    queryKey: ['jawaban-semua-nominee', akses?.periode?.id],
    queryFn: () => fetchAllJawabanNominee(akses.periode.id),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_1A && Boolean(akses?.periode?.id),
  });

  // MODE_1B HYBRID: Fetch voting kategori jika ada
  const { data: votingKategori = [], isLoading: loadingVotingKategori } = useQuery({
    queryKey: ['voting-kategori', akses?.periode?.id],
    queryFn: () => fetchVotingKategori(akses.periode.id),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_1B && Boolean(akses?.periode?.id),
  });

  const { data: votesTersimpan = [], isLoading: loadingVotesTersimpan } = useQuery({
    queryKey: ['votes-tersimpan', token],
    queryFn: () => fetchVotesByVoterToken(token),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_1B && votingKategori.length > 0 && Boolean(token),
  });

  // MODE_2A: Fetch kriteria
  const { data: kriteria = [], isLoading: loadingKriteria } = useQuery({
    queryKey: ['kriteria-mode2a', akses?.periode?.id],
    queryFn: () => fetchKriteriaMode2A(akses.periode.id),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_2A && Boolean(akses?.periode?.id),
  });

  // MODE_2A: Fetch saved votes (for resume)
  const { data: votesMode2A = [], isLoading: loadingVotesMode2A } = useQuery({
    queryKey: ['penilaian-mode2a', token],
    queryFn: () => fetchPenilaianMode2A(token),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_2A && Boolean(token),
  });

  // MODE_PIONIR: Fetch pertanyaan kuesioner pengusul (Fase 1)
  const { data: pertanyaanPionir = [], isLoading: loadingPertanyaanPionir } = useQuery({
    queryKey: ['pertanyaan-pionir', akses?.periode?.id],
    queryFn: () => fetchPertanyaanPionir(akses.periode.id),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_PIONIR && akses?.peranPionir === 'PENGUSUL' && Boolean(akses?.periode?.id),
  });

  // MODE_PIONIR: Fetch kandidat resmi (Fase 2)
  const { data: kandidatPionir = [], isLoading: loadingKandidatPionir } = useQuery({
    queryKey: ['kandidat-pionir', akses?.periode?.id],
    queryFn: () => fetchKandidatPionir(akses.periode.id),
    enabled: aktif && modeSaatIni === MODE_PENILAIAN.MODE_PIONIR && Boolean(akses?.periode?.id),
  });

  // Tentukan MODE_1B variant: flat atau per kategori
  const isMode1BFlat = modeSaatIni === MODE_PENILAIAN.MODE_1B && votingKategori.length === 0;
  const isMode1BKategori = modeSaatIni === MODE_PENILAIAN.MODE_1B && votingKategori.length > 0;

  const [errorSubmit, setErrorSubmit] = useState(null);

  const mutasiMode1A = useMutation({
    mutationFn: ({ daftarSkor, daftarNominee }) =>
      submitPenilaianMode1A(token, akses.periode.id, akses.penilai.id, daftarSkor, daftarNominee),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-penilai', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  const mutasiMode1B = useMutation({
    mutationFn: (nomineeId) => submitQuickVoteMode1B(token, akses.periode.id, akses.penilai.id, nomineeId),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-penilai', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  const mutasiMode1C = useMutation({
    mutationFn: (votes) => submitAllVotesMode1C(token, votes),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-penilai', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  const mutasiMode2A = useMutation({
    mutationFn: (payload) => submitPenilaianMode2A(token, akses.penilai.id, payload),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-penilai', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  const mutasiUsulanPionir = useMutation({
    mutationFn: ({ kandidatId, daftarSkor, kataKunci }) =>
      submitUsulanPionir(token, kandidatId, daftarSkor, kataKunci),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-penilai', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  const mutasiVotePionir = useMutation({
    mutationFn: (kandidatId) => submitVotePionir(token, kandidatId),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-penilai', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  if (!token) {
    return <Navigate to="/penilai" replace />;
  }

  if (loadingToken) {
    return <LoadingScreen label="Memuat..." />;
  }

  if (sudahKirim) {
    return <SuccessScreen nama={akses.penilai.nama} namaPeriode={akses.periode.nama_periode} />;
  }

  if (status !== STATUS_AKSES_TOKEN.AKTIF) {
    return <StatusScreen status={status} keterangan={PESAN_STATUS_AKSES[status]} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-paper to-slate-100/50 pb-10 relative">
      
      {/* Fixed Avatar Left */}
      <div className="fixed top-1/2 -translate-y-[35%] z-0 pointer-events-none left-1/2 -translate-x-[80%] opacity-10 xl:left-auto xl:right-1/2 xl:translate-x-0 xl:mr-[360px] 2xl:mr-[420px] xl:opacity-30">
        <img 
          src={girlAvatarSrc} 
          alt="Pegawai Perempuan" 
          className="h-[400px] xl:h-[500px] 2xl:h-[620px] w-auto drop-shadow-xl animate-float" 
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Fixed Avatar Right */}
      <div className="fixed top-1/2 -translate-y-[35%] z-0 pointer-events-none right-1/2 translate-x-[80%] opacity-10 xl:right-auto xl:left-1/2 xl:translate-x-0 xl:ml-[360px] 2xl:ml-[420px] xl:opacity-30">
        <img 
          src={boyAvatarSrc} 
          alt="Pegawai Laki-laki" 
          className="h-[400px] xl:h-[500px] 2xl:h-[620px] w-auto drop-shadow-xl animate-float" 
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <div className="relative z-10">
        <HeaderProfilAkses
        profil={akses.penilai}
        modePenilaian={akses.periode.mode_penilaian}
        namaPeriode={akses.periode.nama_periode}
      />

      <main className="mx-auto mt-6 w-full max-w-2xl space-y-5 px-4">
        {akses.periode.petunjuk_penilaian && (
          <div className="rounded-2xl border border-navy-200/70 bg-navy-50/60 p-4 text-xs sm:text-sm text-navy-900 flex items-start gap-3 shadow-2xs">
            <Info className="h-4 w-4 shrink-0 text-navy-600 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-navy-950 text-xs uppercase tracking-wider">Petunjuk Penilaian</p>
              <p className="text-slate-700 leading-relaxed">{akses.periode.petunjuk_penilaian}</p>
            </div>
          </div>
        )}

        {loadingNominee || (modeSaatIni === MODE_PENILAIAN.MODE_1A && (loadingPertanyaan || loadingJawaban)) ? (
          <LoadingScreen label="Memuat data..." />
        ) : modeSaatIni === MODE_PENILAIAN.MODE_1A ? (
          <FormMode1A
            token={token}
            nominee={nominee}
            pertanyaan={pertanyaan}
            jawaban={jawabanNominee}
            onSubmit={(daftarSkor, daftarNominee) => {
              setErrorSubmit(null);
              mutasiMode1A.mutate({ daftarSkor, daftarNominee }, {
                onSuccess: () => {
                  localStorage.removeItem(`draft_mode1a_${token}`);
                }
              });
            }}
            isSubmitting={mutasiMode1A.isPending}
            errorMessage={mutasiMode1A.error?.message}
          />
        ) : modeSaatIni === MODE_PENILAIAN.MODE_2A ? (
          (loadingKriteria || loadingVotesMode2A) ? (
            <LoadingScreen label="Memuat data..." />
          ) : (
            <FormMode2A
              akses={akses}
              nominee={nominee}
              kriteria={kriteria}
              votesTersimpan={votesMode2A}
              onSubmit={(payload) => {
                setErrorSubmit(null);
                mutasiMode2A.mutate(payload);
              }}
              isSubmitting={mutasiMode2A.isPending}
            />
          )
        ) : isMode1BFlat ? (
          <GridMode1B
            nominee={nominee}
            periode={akses.periode}
            onSubmit={(nomineeId) => { setErrorSubmit(null); mutasiMode1B.mutate(nomineeId); }}
            isSubmitting={mutasiMode1B.isPending}
          />
        ) : isMode1BKategori ? (
          (loadingVotingKategori || loadingVotesTersimpan) ? (
            <LoadingScreen label="Memuat voting..." />
          ) : (
            <FormMode1C
              token={token}
              nominee={nominee}
              kategori={votingKategori}
              votesTersimpan={votesTersimpan}
              periode={akses.periode}
              onSubmit={(votes) => {
                setErrorSubmit(null);
                mutasiMode1C.mutate(votes, {
                  onSuccess: () => localStorage.removeItem(`draft_mode1c_${token}`)
                });
              }}
              isSubmitting={mutasiMode1C.isPending}
              errorMessage={mutasiMode1C.error?.message}
            />
          )
        ) : modeSaatIni === MODE_PENILAIAN.MODE_PIONIR ? (
          akses?.peranPionir === 'PENGUSUL' ? (
            akses?.fasePionir === 1 ? (
              loadingPertanyaanPionir ? (
                <LoadingScreen label="Memuat kuesioner pengusul..." />
              ) : (
                <FormPionirPengusul
                  token={token}
                  akses={akses}
                  pertanyaan={pertanyaanPionir}
                  onSubmit={(payload) => {
                    setErrorSubmit(null);
                    mutasiUsulanPionir.mutate(payload);
                  }}
                  isSubmitting={mutasiUsulanPionir.isPending}
                  errorMessage={errorSubmit}
                />
              )
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-amber-900">Masa Pengusulan Telah Selesai</h3>
                <p className="text-sm text-amber-800 max-w-md mx-auto">
                  Batas waktu pengusulan kandidat Pionir (Fase 1) telah berakhir. Saat ini pemilihan telah beralih ke tahap voting umum oleh seluruh pegawai.
                </p>
              </div>
            )
          ) : akses?.peranPionir === 'KANDIDAT' ? (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl text-emerald-950">Selamat! Anda Terpilih sebagai Calon Pionir</h3>
              <p className="text-sm text-emerald-800 max-w-lg mx-auto leading-relaxed">
                Anda telah dicalonkan oleh Tim Pengusul sebagai salah satu Insan Teladan (Pionir) BPS. Demi menjunjung objektivitas dan netralitas kompetisi, seluruh kandidat tidak memiliki hak suara dalam pemilihan ini.
              </p>
              <p className="text-xs text-emerald-700 font-medium">
                Terima kasih atas dedikasi dan keteladanan yang telah Anda berikan!
              </p>
            </div>
          ) : akses?.fasePionir === 1 ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-8 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mx-auto">
                <Info className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-navy-900">Tahap Pengusulan Sedang Berlangsung</h3>
                <p className="text-sm text-slate-700 max-w-lg mx-auto leading-relaxed mt-1">
                  Saat ini Tim Pengusul yang ditunjuk sedang melakukan penominasian calon Pionir. Tahap Voting Terbuka (Fase 2) untuk seluruh pegawai akan dibuka pada:
                </p>
              </div>
              <div className="inline-block rounded-xl bg-white border border-blue-200 px-5 py-2.5 font-bold text-navy-900 text-base shadow-2xs">
                {akses.periode.tgl_selesai_fase1 ? new Date(akses.periode.tgl_selesai_fase1).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Segera'}
              </div>
              <p className="text-xs text-slate-500">
                Silakan simpan tautan unik ini dan kunjungi kembali saat voting umum telah dibuka.
              </p>
            </div>
          ) : (
            loadingKandidatPionir ? (
              <LoadingScreen label="Memuat bursa kandidat pionir..." />
            ) : (
              <GridPionirVote
                periode={akses.periode}
                kandidatList={kandidatPionir}
                onSubmit={(kandidatId) => {
                  setErrorSubmit(null);
                  mutasiVotePionir.mutate(kandidatId);
                }}
                isSubmitting={mutasiVotePionir.isPending}
                errorMessage={errorSubmit}
              />
            )
          )
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Mode tidak didukung.
          </div>
        )}
      </main>
      
      <WelcomeModal
        isOpen={tampilModalWelcome}
        onClose={() => setTampilModalWelcome(false)}
        nama={akses.penilai.nama}
        namaPeriode={akses.periode.nama_periode}
      />
      </div>
    </div>
  );
}


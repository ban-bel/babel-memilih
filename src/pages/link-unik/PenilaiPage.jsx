import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

import {
  fetchTokenPenilai,
  fetchDaftarNominee,
  fetchPertanyaanMode1A,
  submitPenilaianMode1A,
  submitQuickVoteMode1B,
  submitAllVotesMode1C,
  fetchAllJawabanNominee,
  fetchVotingKategori,
  fetchVotesByVoterToken,
  fetchKriteriaMode2A,
  fetchPenilaianMode2A,
  submitPenilaianMode2A,
} from '../../services/votingService';
import { getStatusAksesToken, PESAN_STATUS_AKSES } from '../../utils/statusValidator';
import { STATUS_AKSES_TOKEN, MODE_PENILAIAN, getDailyAvatarUrl } from '../../utils/constants';

import LoadingScreen from '../../components/common/LoadingScreen';
import StatusScreen from '../../components/common/StatusScreen';
import HeaderProfilAkses from '../../components/common/HeaderProfilAkses';
import FormMode1A from './components/FormMode1A';
import GridMode1B from './components/GridMode1B';
import FormMode1C from './components/FormMode1C';
import FormMode2A from './components/FormMode2A';
import SuccessScreen from '../../components/common/SuccessScreen';
import Modal from '../../components/common/Modal';

export default function PenilaiPage() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const [sudahKirim, setSudahKirim] = useState(false);
  const [tampilModalWelcome, setTampilModalWelcome] = useState(true);
  const girlAvatarSrc = getDailyAvatarUrl('girl');
  const boyAvatarSrc = getDailyAvatarUrl('boy');

  // Redirect ke halaman verifikasi jika tidak ada token
  if (!token) {
    return <Navigate to="/penilai" replace />;
  }

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

  if (!token || (loadingToken && token)) {
    return token ? <LoadingScreen label="Memuat..." /> : <StatusScreen status={STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID} />;
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

      <main className="mx-auto mt-6 w-full max-w-2xl space-y-4 px-4">
        {akses.periode.petunjuk_penilaian && (
          <div className="rounded-xl border border-navy-200/50 bg-navy-50/50 p-4 text-sm text-navy-800">
            {akses.periode.petunjuk_penilaian}
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
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Mode tidak didukung.
          </div>
        )}
      </main>
      
      <Modal 
        isOpen={tampilModalWelcome} 
        onClose={() => setTampilModalWelcome(false)}
        title="Konfirmasi Penilaian"
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-navy-900">Selamat Datang, {akses.penilai.nama}!</h4>
            <p className="mt-2 text-slate-600">
              Berikut adalah pemilihan buat <span className="font-semibold text-navy-800">{akses.periode.nama_periode}</span> nih!
            </p>
          </div>
          <button
            onClick={() => setTampilModalWelcome(false)}
            className="w-full py-3 px-4 bg-navy-600 hover:bg-navy-700 text-white rounded-xl font-medium transition-colors"
          >
            Mulai Menilai
          </button>
        </div>
      </Modal>
      </div>
    </div>
  );
}

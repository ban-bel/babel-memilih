import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ClipboardList, Trophy, AlertCircle, CheckCircle2 } from 'lucide-react';

import {
  fetchTokenJuri,
  fetchDaftarNominee,
  fetchKategoriPenilaian,
  submitPenilaianMode2,
  fetchRekapMode2,
  fetchJumlahJuriPeriode,
  fetchKeputusanKakan,
  kuncikanPemenang,
  fetchAllJawabanNominee, fetchPertanyaanMode1A,
} from '../../services/votingService';
import { getStatusAksesToken, PESAN_STATUS_AKSES } from '../../utils/statusValidator';
import { STATUS_AKSES_TOKEN } from '../../utils/constants';

import FormKunciPemenang from '../../components/common/FormKunciPemenang';
import SuccessScreen from '../../components/common/SuccessScreen';
import StatusScreen from '../../components/common/StatusScreen';
import LoadingScreen from '../../components/common/LoadingScreen';
import HeaderProfilAkses from '../../components/common/HeaderProfilAkses';
import FormMode2 from './components/FormMode2';
import RekapKetuaJuri from './components/RekapKetuaJuri';

export default function JuriPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();
  const [sudahKirim, setSudahKirim] = useState(false);
  const [tabAktif, setTabAktif] = useState('penilaian');

  const {
    data: akses,
    isLoading: loadingToken,
    isError: tokenError,
  } = useQuery({
    queryKey: ['akses-juri', token],
    queryFn: () => fetchTokenJuri(token),
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
  const periodeId = akses?.periode?.id;
  const isKetuaJuri = Boolean(akses?.is_ketua_juri);

  const { data: rawNominee = [], isLoading: loadingNominee } = useQuery({
    queryKey: ['daftar-nominee', periodeId, akses?.juri?.id],
    queryFn: () => fetchDaftarNominee(periodeId, akses.juri.id),
    enabled: aktif && Boolean(periodeId),
  });

  const nominee = rawNominee.filter(n => 
    akses?.is_can_vote_own_region === false ? n.wilayah_id !== akses?.juri?.wilayah_id : true
  );

  const { data: kategori = [], isLoading: loadingKategori } = useQuery({
    queryKey: ['kategori-mode2', periodeId],
    queryFn: () => fetchKategoriPenilaian(periodeId),
    enabled: aktif && Boolean(periodeId),
  });

  const { data: jawabanNominee = [], isLoading: loadingJawaban } = useQuery({
    queryKey: ['jawaban-semua-nominee', periodeId],
    queryFn: () => fetchAllJawabanNominee(periodeId),
    enabled: aktif && Boolean(periodeId),
  });

  const { data: pertanyaan = [], isLoading: loadingPertanyaan } = useQuery({
    queryKey: ['pertanyaan-periode', periodeId],
    queryFn: () => fetchPertanyaanMode1A(periodeId),
    enabled: aktif && Boolean(periodeId),
  });

  const { data: rekap = [], isLoading: loadingRekap } = useQuery({
    queryKey: ['rekap-mode2', periodeId],
    queryFn: () => fetchRekapMode2(periodeId),
    enabled: isKetuaJuri && tabAktif === 'rekap' && Boolean(periodeId),
    refetchInterval: tabAktif === 'rekap' ? 15_000 : false,
  });

  const { data: totalJuri = 0 } = useQuery({
    queryKey: ['jumlah-juri', periodeId],
    queryFn: () => fetchJumlahJuriPeriode(periodeId),
    enabled: isKetuaJuri && tabAktif === 'rekap' && Boolean(periodeId),
  });

  const { data: keputusanSaatIni } = useQuery({
    queryKey: ['keputusan-kakan', periodeId],
    queryFn: () => fetchKeputusanKakan(periodeId),
    enabled: isKetuaJuri && tabAktif === 'rekap' && Boolean(periodeId),
  });

  const jumlahJuriSelesai = rekap.reduce((max, r) => Math.max(max, r.jumlah_juri_selesai ?? 0), 0);

  const [errorSubmit, setErrorSubmit] = useState(null);

  const mutasiSubmit = useMutation({
    mutationFn: (daftarPenilaian) => submitPenilaianMode2(token, periodeId, akses.juri.id, daftarPenilaian),
    onSuccess: () => {
      setSudahKirim(true);
      queryClient.invalidateQueries({ queryKey: ['akses-juri', token] });
    },
    onError: (err) => setErrorSubmit(err.message),
  });

  const mutasiKunci = useMutation({
    mutationFn: ({ pemenangId, catatan }) => kuncikanPemenang(periodeId, akses.juri.id, pemenangId, catatan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keputusan-kakan', periodeId] }),
    onError: (err) => setErrorSubmit(err.message),
  });

  if (!token) return <StatusScreen status={STATUS_AKSES_TOKEN.TOKEN_TIDAK_VALID} />;
  if (loadingToken) return <LoadingScreen label="Memuat..." />;

  if (sudahKirim && !isKetuaJuri) {
    return <SuccessScreen nama={akses.juri.nama} namaPeriode={akses.periode.nama_periode} />;
  }

  if (status !== STATUS_AKSES_TOKEN.AKTIF && !(sudahKirim && isKetuaJuri)) {
    return <StatusScreen status={status} keterangan={PESAN_STATUS_AKSES[status]} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-paper to-slate-100/50 pb-10">
      <HeaderProfilAkses
        profil={akses.juri}
        modePenilaian={akses.periode.mode_penilaian}
        namaPeriode={akses.periode.nama_periode}
      />

      <main className="mx-auto mt-6 w-full max-w-2xl space-y-4 px-4">
        {isKetuaJuri && (
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-soft">
            <button
              type="button"
              onClick={() => setTabAktif('penilaian')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
                tabAktif === 'penilaian' ? 'bg-navy-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Form Saya
            </button>
            <button
              type="button"
              onClick={() => setTabAktif('rekap')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all ${
                tabAktif === 'rekap' ? 'bg-navy-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Rekap
            </button>
          </div>
        )}

        {errorSubmit && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            {errorSubmit}
          </div>
        )}

        {tabAktif === 'penilaian' ? (
          <>
            {sudahKirim ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                <p className="font-semibold text-emerald-800">Penilaian terkirim!</p>
                <p className="mt-1 text-sm text-emerald-600">Anda bisa memantau tab Rekapitulasi.</p>
              </div>
            ) : loadingNominee || loadingKategori || loadingJawaban || loadingPertanyaan ? (
              <LoadingScreen label="Memuat..." />
            ) : (
              <FormMode2
                token={token}
                nominee={nominee}
                kategori={kategori}
                jawaban={jawabanNominee}
                pertanyaan={pertanyaan}
                onSubmit={(daftarPenilaian) => { 
                  setErrorSubmit(null); 
                  mutasiSubmit.mutate(daftarPenilaian, {
                    onSuccess: () => localStorage.removeItem(`draft_mode2_${token}`)
                  }); 
                }}
                isSubmitting={mutasiSubmit.isPending}
              />
            )}
          </>
        ) : loadingRekap ? (
          <LoadingScreen label="Memuat rekap..." />
        ) : (
          <RekapKetuaJuri
            rekap={rekap}
            jumlahJuriSelesai={jumlahJuriSelesai}
            totalJuri={totalJuri}
            keputusanSaatIni={keputusanSaatIni}
            onKunci={(pemenangId, catatan) => { setErrorSubmit(null); mutasiKunci.mutate({ pemenangId, catatan }); }}
            isSubmitting={mutasiKunci.isPending}
          />
        )}
      </main>
    </div>
  );
}

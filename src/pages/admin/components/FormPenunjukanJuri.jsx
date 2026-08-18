import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Crown, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import { fetchDaftarPegawaiAktifMultiUnit } from '../../../services/adminService';

export default function FormPenunjukanJuri({ wilayahIds, daftar, onChange }) {
  const [kataKunci, setKataKunci] = useState('');

  // Support both single ID and array of IDs
  const wilayahIdArray = Array.isArray(wilayahIds) ? wilayahIds : [wilayahIds].filter(Boolean);

  const { data: hasilCari = [] } = useQuery({
    queryKey: ['cari-pegawai-multi', wilayahIdArray, kataKunci],
    queryFn: () => fetchDaftarPegawaiAktifMultiUnit(wilayahIdArray, kataKunci),
    enabled: kataKunci.trim().length >= 2 && wilayahIdArray.length > 0,
  });

  const jumlahJuri = daftar.length;
  const genap = jumlahJuri > 0 && jumlahJuri % 2 === 0;
  const adaKetua = daftar.some((j) => j.is_ketua_juri);

  function tambah(pegawai) {
    if (daftar.some((j) => j.pegawai_id === pegawai.id)) return;
    onChange([
      ...daftar,
      {
        pegawai_id: pegawai.id,
        nama: pegawai.nama,
        unit_kerja: pegawai.unit_kerja,
        foto_url: pegawai.foto_url,
        is_ketua_juri: daftar.length === 0,
        is_can_vote_own_region: true,
      },
    ]);
    setKataKunci('');
  }

  function toggleCanVoteOwnRegion(pegawaiId) {
    onChange(daftar.map((j) => ({ 
      ...j, 
      is_can_vote_own_region: j.pegawai_id === pegawaiId ? !(j.is_can_vote_own_region ?? true) : (j.is_can_vote_own_region ?? true) 
    })));
  }

  function hapus(pegawaiId) {
    onChange(daftar.filter((j) => j.pegawai_id !== pegawaiId));
  }

  function jadikanKetua(pegawaiId) {
    onChange(daftar.map((j) => ({ ...j, is_ketua_juri: j.pegawai_id === pegawaiId })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Penunjukan Juri</p>
        <span className="badge badge-primary">{jumlahJuri} juri</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari nama pegawai..."
          className="input pl-10"
        />
        {hasilCari.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-soft-lg overflow-hidden">
            {hasilCari.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => tambah(p)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-navy-50"
              >
                <img
                  src={p.foto_url || (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null)}
                  alt={p.nama}
                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=16324a&color=fff&size=64`;
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{p.nama}</p>
                  <p className="text-xs text-slate-500 truncate">{p.unit_kerja}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Daftar Juri */}
      <div className="space-y-2">
        {daftar.map((j) => (
          <div key={j.pegawai_id} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${j.is_ketua_juri ? 'border-gold-300 bg-gold-50/50' : 'border-slate-200 bg-white'}`}>
            <img
              src={j.foto_url || (j.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${j.nip}.jpg` : null)}
              alt={j.nama}
              className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(j.nama)}&background=16324a&color=fff&size=64`;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 truncate">{j.nama}</p>
              <p className="text-xs text-slate-500 truncate">{j.unit_kerja}</p>
              <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={j.is_can_vote_own_region ?? true}
                  onChange={() => toggleCanVoteOwnRegion(j.pegawai_id)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-medium text-slate-600">Bisa nilai kandidat dari wilayah asalnya</span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => jadikanKetua(j.pegawai_id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                j.is_ketua_juri
                  ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-gold-100 hover:text-gold-700'
              }`}
            >
              <Crown className="h-3.5 w-3.5" />
              {j.is_ketua_juri ? 'Ketua' : 'Jadikan Ketua'}
            </button>
            <button
              type="button"
              onClick={() => hapus(j.pegawai_id)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {daftar.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
            <User className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Belum ada juri ditunjuk</p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={`flex items-start gap-2 rounded-xl p-3 ${genap ? 'bg-amber-50 text-amber-700' : jumlahJuri > 0 && !adaKetua ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
        {genap ? <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" /> : !adaKetua && jumlahJuri > 0 ? <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />}
        <div className="text-sm">
          {jumlahJuri} juri ditunjuk.
          {genap && ' Sebaiknya jumlah ganjil untuk menghindari seri.'}
          {!adaKetua && jumlahJuri > 0 && !genap && ' Tunjuk salah satu sebagai Ketua Juri.'}
          {jumlahJuri === 0 && ' Cari dan tambahkan juri di atas.'}
        </div>
      </div>
    </div>
  );
}

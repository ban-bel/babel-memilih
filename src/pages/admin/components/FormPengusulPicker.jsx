import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, UserCheck, AlertCircle, Users } from 'lucide-react';
import { fetchDaftarPegawaiAktifMultiUnit } from '../../../services/adminService';

/**
 * Komponen FormPengusulPicker untuk Mode PIONIR.
 * Digunakan oleh Admin untuk menentukan siapa saja pegawai yang bertindak sebagai Pengusul (Nominator).
 */
export default function FormPengusulPicker({ wilayahIds, daftar = [], onChange }) {
  const [kataKunci, setKataKunci] = useState('');

  const wilayahIdArray = Array.isArray(wilayahIds) ? wilayahIds : [wilayahIds].filter(Boolean);

  const { data: hasilCari = [] } = useQuery({
    queryKey: ['cari-pegawai-pengusul', wilayahIdArray, kataKunci],
    queryFn: () => fetchDaftarPegawaiAktifMultiUnit(wilayahIdArray, kataKunci),
    enabled: kataKunci.trim().length >= 2 && wilayahIdArray.length > 0,
  });

  const jumlahPengusul = daftar.length;

  function tambah(pegawai) {
    if (daftar.some((p) => p.pegawai_id === pegawai.id || p.id === pegawai.id)) return;
    onChange([
      ...daftar,
      {
        pegawai_id: pegawai.id,
        id: pegawai.id,
        nama: pegawai.nama,
        nip: pegawai.nip,
        nip_baru: pegawai.nip_baru,
        jabatan: pegawai.jabatan,
        unit_kerja: pegawai.unit_kerja,
        foto_url: pegawai.foto_url,
      },
    ]);
    setKataKunci('');
  }

  function hapus(pegawaiId) {
    onChange(daftar.filter((p) => (p.pegawai_id || p.id) !== pegawaiId));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-navy-700" />
          <p className="text-sm font-semibold text-slate-800">Penunjukan Tim Pengusul (Nominator)</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-100 px-3 py-1 text-xs font-semibold text-navy-800">
          <Users className="h-3.5 w-3.5" />
          {jumlahPengusul} Pengusul
        </span>
      </div>

      <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 text-xs text-blue-800 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
        <p>
          Pegawai yang ditunjuk sebagai <strong>Pengusul</strong> bertugas mengajukan 1 kandidat serta mengisi skor kuesioner pada <strong>Fase 1</strong>. Sesuai aturan netralitas, pengusul <strong>tidak dapat dicalonkan</strong> dan tidak memberikan suara di Fase 2.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={kataKunci}
          onChange={(e) => setKataKunci(e.target.value)}
          placeholder="Cari nama pegawai untuk ditunjuk sebagai pengusul..."
          className="input pl-10 text-sm"
        />

        {hasilCari.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-soft-xl">
            {hasilCari.map((p) => {
              const sudahDitunjuk = daftar.some((d) => (d.pegawai_id || d.id) === p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  disabled={sudahDitunjuk}
                  onClick={() => tambah(p)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    sudahDitunjuk
                      ? 'bg-slate-50 opacity-50 cursor-not-allowed'
                      : 'hover:bg-navy-50 cursor-pointer'
                  }`}
                >
                  <img
                    src={p.foto_url || (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null)}
                    alt={p.nama}
                    className="h-8 w-8 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=16324a&color=fff&size=64`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate text-xs sm:text-sm">{p.nama}</p>
                    <p className="text-[11px] text-slate-500 truncate">{p.jabatan || p.unit_kerja}</p>
                  </div>
                  {sudahDitunjuk ? (
                    <span className="text-[10px] font-medium text-slate-400">Sudah Dipilih</span>
                  ) : (
                    <span className="text-xs font-semibold text-navy-600 hover:text-navy-800">+ Tambah</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Daftar Pengusul Terpilih */}
      {daftar.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
          Belum ada pengusul yang ditunjuk. Silakan cari nama pegawai di atas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {daftar.map((p) => {
            const pId = p.pegawai_id || p.id;
            return (
              <div
                key={pId}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all hover:border-slate-300"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.foto_url || (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null)}
                    alt={p.nama}
                    className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=16324a&color=fff&size=64`;
                    }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-800 truncate">{p.nama}</p>
                    <p className="text-[10px] text-slate-500 truncate">{p.jabatan || p.unit_kerja}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => hapus(pId)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Hapus dari pengusul"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

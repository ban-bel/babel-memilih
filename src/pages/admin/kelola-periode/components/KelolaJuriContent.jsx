import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../config/supabaseClient';
import { fetchDaftarJuriLengkap } from '../../../../services/adminService';
import { Loader2, Plus, Trash2, Shield, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KelolaJuriContent({ periodeId }) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loadingPegawai, setLoadingPegawai] = useState(false);
  const [canVoteOwnRegion, setCanVoteOwnRegion] = useState(true);

  // Fetch Juri
  const { data: daftarJuri = [], isLoading: loadingJuri } = useQuery({
    queryKey: ['juri-periode', periodeId],
    queryFn: () => fetchDaftarJuriLengkap(periodeId),
    enabled: Boolean(periodeId),
  });

  // Cari Pegawai
  const cariPegawai = async () => {
    if (!searchTerm) return;
    setLoadingPegawai(true);
    try {
      const { data, error } = await supabase
        .from('pegawai')
        .select('*')
        .ilike('nama', `%${searchTerm}%`)
        .limit(10);
      if (error) throw error;
      setPegawaiList(data || []);
    } catch (error) {
      toast.error('Gagal mencari pegawai: ' + error.message);
    } finally {
      setLoadingPegawai(false);
    }
  };

  // Tambah Juri Mutation
  const tambahJuri = useMutation({
    mutationFn: async ({ pegawai, isKetua }) => {
      // Cek apakah sudah jadi juri
      if (daftarJuri.some((j) => j.pegawai_id === pegawai.id)) {
        throw new Error('Pegawai ini sudah menjadi juri!');
      }

      const payload = {
        periode_id: periodeId,
        pegawai_id: pegawai.id,
        is_ketua_juri: isKetua,
        is_can_vote_own_region: canVoteOwnRegion
      };

      const { data, error } = await supabase
        .from('juri_periode')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Juri berhasil ditambahkan!');
      queryClient.invalidateQueries({ queryKey: ['juri-periode', periodeId] });
      queryClient.invalidateQueries({ queryKey: ['partisipan-juri', periodeId] });
      setIsModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Hapus Juri Mutation
  const hapusJuri = useMutation({
    mutationFn: async (juriId) => {
      // Hapus juri_periode (jika ada relasi dengan penilaian_skor, ini bisa error foreign key, tapi untuk juri baru belum ada skor)
      const { error } = await supabase
        .from('juri_periode')
        .delete()
        .eq('id', juriId);
      
      if (error) {
        if (error.code === '23503') throw new Error('Gagal: Juri ini sudah memiliki data penilaian (skor).');
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Juri berhasil dihapus!');
      queryClient.invalidateQueries({ queryKey: ['juri-periode', periodeId] });
      queryClient.invalidateQueries({ queryKey: ['partisipan-juri', periodeId] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (loadingJuri) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-navy-600" /></div>;

  return (
    <div className="space-y-6 animate-fade-in mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Daftar Dewan Juri</h3>
          <p className="text-sm text-slate-500">Kelola juri yang akan menilai pada periode ini.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Juri
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama Juri</th>
              <th className="px-4 py-3">NIP</th>
              <th className="px-4 py-3">Peran</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {daftarJuri.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Belum ada juri.</td></tr>
            ) : (
              daftarJuri.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{j.pegawai?.nama || '-'}</td>
                  <td className="px-4 py-3">{j.pegawai?.nip || j.pegawai?.nip_baru || '-'}</td>
                  <td className="px-4 py-3">
                    {j.is_ketua_juri ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        <Shield className="h-3 w-3" />
                        Ketua Juri
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        Anggota
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm('Yakin ingin menghapus juri ini? Jika juri sudah melakukan penilaian, aksi ini akan dibatalkan otomatis oleh sistem.')) {
                          hapusJuri.mutate(j.id);
                        }
                      }}
                      disabled={hapusJuri.isPending}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                      title="Hapus Juri"
                    >
                      {hapusJuri.isPending && hapusJuri.variables === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TAMBAH JURI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="font-bold text-slate-800">Tambah Juri Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex gap-2 mb-4">
                <input 
                  type="text"
                  placeholder="Cari nama pegawai..."
                  className="input flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cariPegawai()}
                />
                <button onClick={cariPegawai} className="btn-primary px-3">
                  {loadingPegawai ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>

              <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canVoteOwnRegion}
                    onChange={(e) => setCanVoteOwnRegion(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Bisa menilai kandidat dari wilayah asalnya
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 pl-6">
                  Jika dimatikan, juri ini tidak akan bisa melihat dan menilai kandidat yang berasal dari wilayah kerja yang sama dengannya.
                </p>
              </div>

              {pegawaiList.length > 0 && (
                <div className="space-y-2">
                  {pegawaiList.map(peg => (
                    <div key={peg.id} className="flex items-center justify-between border border-slate-100 p-3 rounded-lg hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{peg.nama}</p>
                        <p className="text-xs text-slate-500">{peg.jabatan || 'Tanpa Jabatan'} • {peg.unit_kerja}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => tambahJuri.mutate({ pegawai: peg, isKetua: false })}
                          disabled={tambahJuri.isPending}
                          className="btn-secondary text-xs px-2 py-1"
                        >
                          + Anggota
                        </button>
                        <button 
                          onClick={() => tambahJuri.mutate({ pegawai: peg, isKetua: true })}
                          disabled={tambahJuri.isPending}
                          className="bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg font-medium text-xs px-2 py-1 transition-colors"
                        >
                          + Ketua
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

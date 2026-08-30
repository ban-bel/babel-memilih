import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../config/supabaseClient';
import { fetchDaftarJuriLengkap } from '../../../../services/adminService';
import { Loader2, Plus, Trash2, Shield, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import MatriksJuriNominee from './MatriksJuriNominee';

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {daftarJuri.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
            Belum ada juri.
          </div>
        ) : (
          daftarJuri.map((j) => (
            <div key={j.id} className="relative flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-soft group">
              <img
                src={j.pegawai?.foto_url || (j.pegawai?.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${j.pegawai.nip}.jpg` : null)}
                alt={j.pegawai?.nama}
                className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(j.pegawai?.nama || 'J')}&background=16324a&color=fff&size=64`;
                }}
              />
              <div className="flex-1 min-w-0 pr-6">
                <p className="font-semibold text-slate-900 truncate" title={j.pegawai?.nama}>{j.pegawai?.nama || '-'}</p>
                <p className="text-xs text-slate-500 mb-2 truncate" title={j.pegawai?.nip || j.pegawai?.nip_baru}>{j.pegawai?.nip || j.pegawai?.nip_baru || '-'}</p>
                <div>
                  {j.is_ketua_juri ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      <Shield className="h-3 w-3" />
                      Ketua Juri
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                      Anggota
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Yakin ingin menghapus juri ini? Jika juri sudah melakukan penilaian, aksi ini akan dibatalkan otomatis oleh sistem.')) {
                    hapusJuri.mutate(j.id);
                  }
                }}
                disabled={hapusJuri.isPending}
                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Hapus Juri"
              >
                {hapusJuri.isPending && hapusJuri.variables === j.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))
        )}
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
      <MatriksJuriNominee periodeId={periodeId} />
    </div>
  );
}

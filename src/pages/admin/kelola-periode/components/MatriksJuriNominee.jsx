import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../config/supabaseClient';
import { fetchDaftarJuriLengkap, toggleBlockJuriNominee } from '../../../../services/adminService';
import { fetchDaftarNominee } from '../../../../services/voting/nomineeService';
import { Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MatriksJuriNominee({ periodeId }) {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  // Fetch Juri
  const { data: daftarJuri = [], isLoading: loadingJuri } = useQuery({
    queryKey: ['juri-periode', periodeId],
    queryFn: () => fetchDaftarJuriLengkap(periodeId),
    enabled: Boolean(periodeId),
  });

  // Fetch Nominee
  const { data: daftarNominee = [], isLoading: loadingNominee } = useQuery({
    queryKey: ['nominee-periode', periodeId],
    queryFn: () => fetchDaftarNominee(periodeId, -1), // -1 dummy exclude
    enabled: Boolean(periodeId),
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ juriPeriodeId, nomineeId, currentBlockedIds }) => {
      return await toggleBlockJuriNominee(juriPeriodeId, nomineeId, currentBlockedIds);
    },
    onMutate: () => setIsToggling(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['juri-periode', periodeId] });
      toast.success('Aturan blacklist diperbarui');
    },
    onError: (err) => {
      toast.error(err.message);
    },
    onSettled: () => setIsToggling(false)
  });

  const handleToggle = (juri, nominee) => {
    if (isToggling) return;
    toggleMutation.mutate({
      juriPeriodeId: juri.id,
      nomineeId: nominee.id,
      currentBlockedIds: juri.blocked_nominee_ids || []
    });
  };

  if (loadingJuri || loadingNominee) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-navy-600 h-6 w-6" /></div>;
  }

  if (daftarJuri.length === 0 || daftarNominee.length === 0) {
    return (
      <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-500 border border-slate-200 mt-6">
        <Info className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p>Data Juri atau Nominee belum lengkap untuk menampilkan matriks tabulasi.</p>
      </div>
    );
  }

  return (
    <div className="mt-10 animate-fade-in-up">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-800">Matriks Hak Penilaian (Custom Blacklist)</h3>
        <p className="text-sm text-slate-500">
          Klik pada sel matriks untuk memblokir secara manual (⛔) Juri agar tidak bisa menilai Nominee tertentu.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-100 text-xs uppercase text-slate-700">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-slate-100 border-r border-slate-200 z-10 w-64 min-w-[250px]">
                Juri \\ Nominee
              </th>
              {daftarNominee.map(nominee => (
                <th key={nominee.id} className="px-4 py-3 text-center border-b border-slate-200 min-w-[120px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-bold text-navy-700 line-clamp-1">{nominee.nama?.split(' ')[0]}</span>
                    <span className="text-[10px] text-slate-400 font-normal truncate max-w-full">
                      {nominee.unit_kerja || 'Wilayah ?'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {daftarJuri.map((juri, index) => (
              <tr key={juri.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="px-4 py-3 sticky left-0 bg-inherit border-r border-slate-100 z-10">
                  <div className="font-medium text-slate-800 line-clamp-1">{juri.pegawai?.nama}</div>
                  <div className="text-xs text-slate-400">{juri.pegawai?.wilayah?.nama_wilayah || '-'}</div>
                </td>
                
                {daftarNominee.map(nominee => {
                  const isBlockedManually = (juri.blocked_nominee_ids || []).includes(nominee.id);
                  const isBlockedByRegion = juri.is_can_vote_own_region === false && 
                                            juri.pegawai?.wilayah_id === nominee.wilayah_id;
                  
                  let statusIcon = '✅';
                  let statusClass = 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-pointer hover:bg-emerald-100';
                  let tooltip = 'Klik untuk memblokir secara manual';

                  if (isBlockedByRegion) {
                    statusIcon = '❌';
                    statusClass = 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60';
                    tooltip = 'Dikunci otomatis (Aturan Daerah Asal)';
                  } else if (isBlockedManually) {
                    statusIcon = '⛔';
                    statusClass = 'bg-rose-50 text-rose-600 border-rose-200 cursor-pointer hover:bg-rose-100 shadow-inner-soft';
                    tooltip = 'Daftar Hitam Manual (Klik untuk membatalkan)';
                  }

                  return (
                    <td key={nominee.id} className="px-2 py-2 text-center align-middle">
                      <button
                        disabled={isBlockedByRegion || isToggling}
                        onClick={() => handleToggle(juri, nominee)}
                        title={tooltip}
                        className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg mx-auto transition-all ${statusClass}`}
                      >
                        {statusIcon}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 rounded bg-emerald-50 border border-emerald-200">✅</span> Berhak Menilai</div>
        <div className="flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 rounded bg-slate-100 border border-slate-200 opacity-60">❌</span> Terkunci Aturan Otomatis (Daerah Asal sama)</div>
        <div className="flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 rounded bg-rose-50 border border-rose-200 shadow-inner-soft">⛔</span> Diblokir Manual oleh Admin</div>
      </div>
    </div>
  );
}

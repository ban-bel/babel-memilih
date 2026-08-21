import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../config/supabaseClient';
import { toast } from 'react-hot-toast';
import { simpanKategoriMode2 } from '../../../../services/adminService';
import FormKategoriBuilder from '../../components/FormKategoriBuilder';
import { Lock, Save, Loader2 } from 'lucide-react';

export default function KelolaKategoriContent({ periodeId, periode }) {
  const queryClient = useQueryClient();
  const [daftarKategori, setDaftarKategori] = useState([]);

  // Fetch whether scoring has started
  const { data: isLocked = false, isLoading: loadingLock } = useQuery({
    queryKey: ['check-penilaian', periodeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('penilaian_juri')
        .select('*', { count: 'exact', head: true })
        .eq('periode_id', periodeId);
      if (error) throw error;
      return count > 0;
    }
  });

  // Fetch categories
  const { data: kategoriFetched, isLoading: loadingKategori } = useQuery({
    queryKey: ['kategori-penilaian', periodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kategori_penilaian')
        .select('*')
        .eq('periode_id', periodeId)
        .order('id', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (kategoriFetched) {
      const formatted = kategoriFetched.map(k => ({
        key: `db-${k.id}`,
        nama_kategori: k.nama_kategori,
        deskripsi: k.deskripsi || '',
        bobot_persen: k.bobot_persen,
        skor_min: k.skor_min,
        skor_max: k.skor_max,
        // Mark as system if it corresponds to a toggle
        is_system: [
          'Video Profil', 
          'Portofolio Pengembangan Diri', 
          'Portofolio Inovasi', 
          'Portofolio Penghargaan'
        ].includes(k.nama_kategori) || k.nama_kategori.startsWith('Dokumen: ')
      }));
      setDaftarKategori(formatted);
    }
  }, [kategoriFetched]);

  const mutasiSimpan = useMutation({
    mutationFn: () => simpanKategoriMode2(periodeId, daftarKategori),
    onSuccess: () => {
      toast.success('Kategori berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['kategori-penilaian', periodeId] });
    },
    onError: (err) => toast.error(err.message)
  });

  if (loadingLock || loadingKategori) {
    return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-navy-500" /></div>;
  }

  const totalBobot = daftarKategori.reduce((sum, k) => sum + (Number(k.bobot_persen) || 0), 0);
  const isValid = Number(totalBobot.toFixed(2)) === 100;

  if (isLocked) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-soft-lg rounded-[1.5rem] p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-700">
            <Lock className="h-8 w-8 shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Kategori Terkunci</h3>
              <p className="text-sm">Anda tidak dapat mengubah kategori atau bobot karena sudah ada Juri yang memasukkan nilai untuk periode ini. Mengubah bobot di tengah proses akan merusak perhitungan skor akhir.</p>
            </div>
          </div>

          <div className="space-y-3">
            {daftarKategori.map((k, idx) => (
              <div key={k.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{k.nama_kategori}</p>
                    <p className="text-xs text-slate-500">{k.deskripsi || 'Tidak ada deskripsi'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-navy-900 text-lg">{k.bobot_persen}%</p>
                  <p className="text-[10px] text-slate-500 font-medium">Rentang: {k.skor_min} - {k.skor_max}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-soft-lg rounded-[1.5rem] p-6 sm:p-8">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h3 className="font-bold text-lg text-navy-900">Edit Kategori & Bobot</h3>
          <p className="text-sm text-slate-500">Sesuaikan kategori dan bobot penilaian. Pastikan total bobot tepat 100%.</p>
        </div>

        <FormKategoriBuilder 
          daftar={daftarKategori} 
          onChange={setDaftarKategori} 
          formState={periode} 
        />

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => mutasiSimpan.mutate()}
            disabled={!isValid || mutasiSimpan.isPending}
            className="btn-primary"
          >
            {mutasiSimpan.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../../../components/common/Modal';
import { fetchWilayahList, fetchUnitKerjaPeriode, simpanUnitKerjaPeriode, generateTokenPenilaianMultiUnit } from '../../../../services/adminService';
import Select from 'react-select';
import { MapPin, Plus, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ModalTambahWilayahSusulan({ isOpen, onClose, periode, adminProfile }) {
  const queryClient = useQueryClient();
  const [selectedWilayahIds, setSelectedWilayahIds] = useState([]);

  // Fetch semua wilayah
  const { data: wilayahList = [], isLoading: loadingWilayah } = useQuery({
    queryKey: ['wilayah-list'],
    queryFn: fetchWilayahList,
    enabled: isOpen
  });

  // Fetch wilayah yang sudah ada di periode ini
  const { data: existingUnit = [], isLoading: loadingExisting } = useQuery({
    queryKey: ['periode-unit-kerja', periode?.id],
    queryFn: () => fetchUnitKerjaPeriode(periode.id),
    enabled: isOpen && !!periode?.id
  });

  const isProvinsiAdmin = adminProfile?.role === 'ADMIN_PROVINSI';
  const isKabKotaAdmin = adminProfile?.role === 'ADMIN_KAB_KOTA';

  // Opsi wilayah yang tersedia (difilter dari yang sudah ada dan hak akses admin)
  const availableOptions = useMemo(() => {
    if (!wilayahList.length) return [];
    
    // Filter berdasarkan role admin
    let allowed = wilayahList;
    if (isKabKotaAdmin) {
      allowed = allowed.filter(w => w.id === Number(adminProfile?.wilayah_id));
    } else if (isProvinsiAdmin) {
      allowed = allowed.filter(w => w.id === Number(adminProfile?.wilayah_id) || w.parent_id === Number(adminProfile?.wilayah_id));
    }

    // Filter wilayah yang sudah terdaftar di periode
    const existingIds = new Set(existingUnit.map(u => Number(u.wilayah_id)));
    const notRegistered = allowed.filter(w => !existingIds.has(w.id));

    return notRegistered.map(w => ({
      value: w.id,
      label: `${w.nama_unit_kerja || w.nama_wilayah}${w.kode_wilayah ? ` (${w.kode_wilayah})` : ''}`,
    }));
  }, [wilayahList, existingUnit, adminProfile, isKabKotaAdmin, isProvinsiAdmin]);

  const mutasiTambah = useMutation({
    mutationFn: async (wilayahIds) => {
      // 1. Simpan wilayah baru ke tabel periode_unit_kerja
      await simpanUnitKerjaPeriode(periode.id, wilayahIds);
      // 2. Buat token akses untuk wilayah baru tersebut
      const jumlahToken = await generateTokenPenilaianMultiUnit(periode.id, wilayahIds);
      return jumlahToken;
    },
    onSuccess: (jumlahToken) => {
      toast.success(`Berhasil! ${selectedWilayahIds.length} wilayah baru ditambahkan dan ${jumlahToken || 0} token dicetak.`);
      queryClient.invalidateQueries({ queryKey: ['periode-list'] });
      queryClient.invalidateQueries({ queryKey: ['periode-unit-kerja', periode.id] });
      setSelectedWilayahIds([]);
      onClose();
    },
    onError: (err) => {
      toast.error('Gagal menambah wilayah: ' + err.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedWilayahIds || selectedWilayahIds.length === 0) {
      toast.error('Pilih minimal satu wilayah!');
      return;
    }
    mutasiTambah.mutate(selectedWilayahIds.map(opt => opt.value));
  };

  if (!periode) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Wilayah Susulan" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Penting:</strong> Menambah wilayah susulan akan langsung membuat/mencetak Token Akses (Link Unik) baru khusus untuk wilayah tersebut tanpa mengubah atau menghapus data kandidat dan juri dari wilayah yang sudah ada.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Pilih Wilayah Baru</label>
          <Select
            isMulti
            options={availableOptions}
            value={selectedWilayahIds}
            onChange={setSelectedWilayahIds}
            placeholder={loadingWilayah || loadingExisting ? "Memuat data wilayah..." : "Pilih wilayah..."}
            isLoading={loadingWilayah || loadingExisting}
            noOptionsMessage={() => "Tidak ada wilayah tersisa yang bisa ditambahkan."}
            className="text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
          <button type="button" onClick={onClose} className="btn-ghost">Batal</button>
          <button type="submit" disabled={mutasiTambah.isPending || selectedWilayahIds.length === 0} className="btn-primary">
            {mutasiTambah.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Tambah Wilayah & Cetak Token
          </button>
        </div>
      </form>
    </Modal>
  );
}

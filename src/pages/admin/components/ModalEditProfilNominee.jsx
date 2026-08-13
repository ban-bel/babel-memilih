import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Link as LinkIcon, Save, Table, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { updateProfilTambahanNominee } from '../../../services/votingService';

export default function ModalEditProfilNominee({ isOpen, onClose, nominee, periodeId }) {
  const queryClient = useQueryClient();
  const [dokumenLink, setDokumenLink] = useState('');
  const [tabelKehadiran, setTabelKehadiran] = useState([]);

  useEffect(() => {
    if (nominee) {
      setDokumenLink(nominee.dokumen_link || '');
      // Ensure tabel_kehadiran is an array
      let initialTable = [];
      if (Array.isArray(nominee.tabel_kehadiran)) {
        initialTable = nominee.tabel_kehadiran;
      } else if (typeof nominee.tabel_kehadiran === 'string') {
        try {
          initialTable = JSON.parse(nominee.tabel_kehadiran);
        } catch (e) {
          initialTable = [];
        }
      }
      setTabelKehadiran(initialTable);
    }
  }, [nominee]);

  const mutasiSimpan = useMutation({
    mutationFn: () => updateProfilTambahanNominee(nominee.id, dokumenLink, tabelKehadiran),
    onSuccess: () => {
      toast.success('Profil tambahan berhasil disimpan!');
      const pid = Number(periodeId);
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', pid] });
      queryClient.invalidateQueries({ queryKey: ['nominee-periode', String(pid)] });
      queryClient.invalidateQueries({ queryKey: ['daftar-nominee'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal menyimpan profil.');
    }
  });

  const tambahBaris = () => {
    setTabelKehadiran([
      ...tabelKehadiran,
      { label_baris: '', tl1: 0, tl2: 0, psw4: 0, kjk: '00:00:00' }
    ]);
  };

  const hapusBaris = (index) => {
    const newTabel = [...tabelKehadiran];
    newTabel.splice(index, 1);
    setTabelKehadiran(newTabel);
  };

  const updateBaris = (index, field, value) => {
    const newTabel = [...tabelKehadiran];
    if (field === 'label_baris') {
      newTabel[index][field] = value;
    } else {
      newTabel[index][field] = Number(value) || 0;
    }
    setTabelKehadiran(newTabel);
  };

  if (!nominee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Profil: ${nominee.pegawai?.nama}`} maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* Link Dokumen / PDF */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <LinkIcon className="h-4 w-4 text-navy-500" />
            Link Google Drive (PDF Dokumen)
          </label>
          <input
            type="url"
            value={dokumenLink}
            onChange={(e) => setDokumenLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
          <p className="text-xs text-slate-500">
            Pastikan hak akses link Google Drive diatur ke "Anyone with the link can view".
          </p>
        </div>

        <hr className="border-slate-200" />

        {/* Tabel Kehadiran */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Table className="h-4 w-4 text-navy-500" />
              Tabel Kehadiran (Opsional)
            </label>
            <button
              onClick={tambahBaris}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
              <Plus className="h-4 w-4" /> Tambah Baris
            </button>
          </div>

          {tabelKehadiran.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
              Belum ada data tabel kehadiran. Klik tambah baris untuk memulai.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Periode / Keterangan</th>
                    <th className="px-4 py-3 font-semibold text-center w-20">TL1</th>
                    <th className="px-4 py-3 font-semibold text-center w-20">TL2</th>
                    <th className="px-4 py-3 font-semibold text-center w-20">PSW4</th>
                    <th className="px-4 py-3 font-semibold text-center w-20">KJK</th>
                    <th className="px-4 py-3 text-center w-12">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tabelKehadiran.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={row.label_baris}
                          onChange={(e) => updateBaris(idx, 'label_baris', e.target.value)}
                          placeholder="Cth: 2025"
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-navy-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          value={row.tl1}
                          onChange={(e) => updateBaris(idx, 'tl1', e.target.value)}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center focus:border-navy-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          value={row.tl2}
                          onChange={(e) => updateBaris(idx, 'tl2', e.target.value)}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center focus:border-navy-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          value={row.psw4}
                          onChange={(e) => updateBaris(idx, 'psw4', e.target.value)}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center focus:border-navy-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="text"
                          placeholder="00:00:00"
                          value={row.kjk}
                          onChange={(e) => updateBaris(idx, 'kjk', e.target.value)}
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center focus:border-navy-400 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => hapusBaris(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => mutasiSimpan.mutate()}
            disabled={mutasiSimpan.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {mutasiSimpan.isPending ? 'Menyimpan...' : (
              <>
                <Save className="h-4 w-4" />
                Simpan Profil
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

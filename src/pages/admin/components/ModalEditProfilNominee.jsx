import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Link as LinkIcon, Save, Table, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../../components/common/Modal';
import { updateProfilTambahanNominee, fetchPertanyaanMode1A, fetchJawabanNominee, adminUpdateDaftarJawaban } from '../../../services/votingService';
import { useQuery } from '@tanstack/react-query';
import FormPortofolioNominee from '../../link-unik/components/FormPortofolioNominee';

export default function ModalEditProfilNominee({ 
  isOpen, 
  onClose, 
  nominee, 
  periodeId, 
  isTabelKehadiranEnabled,
  isVideoProfilEnabled,
  isPortofolioPengembanganEnabled,
  isPortofolioInovasiEnabled,
  isPortofolioPenghargaanEnabled
}) {
  const queryClient = useQueryClient();
  const [dokumenLink, setDokumenLink] = useState('');
  const [tabelKehadiran, setTabelKehadiran] = useState([]);
  const [videoProfilLink, setVideoProfilLink] = useState('');
  const [portofolioPengembangan, setPortofolioPengembangan] = useState([]);
  const [portofolioInovasi, setPortofolioInovasi] = useState([]);
  const [portofolioPenghargaan, setPortofolioPenghargaan] = useState([]);
  const [jawabanTambahan, setJawabanTambahan] = useState({});

  const { data: pertanyaanList = [] } = useQuery({
    queryKey: ['pertanyaan-periode', periodeId],
    queryFn: () => fetchPertanyaanMode1A(periodeId),
    enabled: Boolean(periodeId),
  });

  const { data: jawabanList } = useQuery({
    queryKey: ['jawaban-nominee', periodeId, nominee?.pegawai_id],
    queryFn: () => fetchJawabanNominee(periodeId, nominee?.pegawai_id),
    enabled: Boolean(periodeId) && Boolean(nominee?.pegawai_id),
  });

  useEffect(() => {
    const initialJawaban = {};
    if (jawabanList && jawabanList.length > 0) {
      jawabanList.forEach(j => {
        initialJawaban[j.pertanyaan_id] = j.teks_jawaban || '';
      });
    }
    setJawabanTambahan(initialJawaban);
  }, [jawabanList]);

  useEffect(() => {
    if (nominee) {
      setDokumenLink(nominee.dokumen_link || '');
      setVideoProfilLink(nominee.video_profil_link || '');
      setPortofolioPengembangan(nominee.portofolio_pengembangan || []);
      setPortofolioInovasi(nominee.portofolio_inovasi || []);
      setPortofolioPenghargaan(nominee.portofolio_penghargaan || []);
      
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
    mutationFn: async () => {
      await updateProfilTambahanNominee(
        nominee.id, 
        dokumenLink, 
        tabelKehadiran,
        videoProfilLink,
        portofolioPengembangan,
        portofolioInovasi,
        portofolioPenghargaan
      );
      
      const daftarJawaban = Object.entries(jawabanTambahan).map(([pid, teks]) => ({
        pertanyaan_id: Number(pid),
        teks_jawaban: teks
      }));
      if (daftarJawaban.length > 0) {
        await adminUpdateDaftarJawaban(periodeId, nominee.pegawai_id, daftarJawaban);
      }
    },
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
    if (field === 'label_baris' || field === 'kjk') {
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
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-navy-500" />
            Link Google Drive (PDF Dokumen)
          </h3>
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

                {/* Daftar Isian / Pertanyaan Dinamis */}
        {pertanyaanList.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-navy-500" />
              Daftar Isian / Pertanyaan Dinamis
            </h3>
            {pertanyaanList.map((p) => (
              <div key={p.id} className="space-y-2 pl-6">
                <label className="block text-xs font-medium text-slate-600">
                  {p.urutan}. {p.teks_pertanyaan}
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
                  placeholder="Isi jawaban atau tempel link dokumen di sini..."
                  value={jawabanTambahan[p.id] || ''}
                  onChange={(e) => setJawabanTambahan({ ...jawabanTambahan, [p.id]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Link Video Profil */}
        {isVideoProfilEnabled && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-3">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-navy-500" />
              Link Video Profil (YouTube)
            </h3>
            <input
              type="url"
              value={videoProfilLink}
              onChange={(e) => setVideoProfilLink(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>
        </div>
        )}

        {/* Portofolio Pengembangan Diri */}
        {isPortofolioPengembanganEnabled && (
          <FormPortofolioNominee 
            type="portofolio_pengembangan" 
            dataTersimpan={portofolioPengembangan} 
            onSimpan={async (rows) => setPortofolioPengembangan(rows)} 
          />
        )}

        {/* Portofolio Inovasi */}
        {isPortofolioInovasiEnabled && (
          <FormPortofolioNominee 
            type="portofolio_inovasi" 
            dataTersimpan={portofolioInovasi} 
            onSimpan={async (rows) => setPortofolioInovasi(rows)} 
          />
        )}

        {/* Portofolio Penghargaan */}
        {isPortofolioPenghargaanEnabled && (
          <FormPortofolioNominee 
            type="portofolio_penghargaan" 
            dataTersimpan={portofolioPenghargaan} 
            onSimpan={async (rows) => setPortofolioPenghargaan(rows)} 
          />
        )}

        {/* Tabel Kehadiran */}
        {isTabelKehadiranEnabled && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Table className="h-5 w-5 text-navy-500" />
              Tabel Kehadiran (Opsional)
            </h3>
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
                    <th className="px-4 py-3 font-semibold text-center w-28 leading-tight">
                      KJK
                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">jam : menit : detik</div>
                    </th>
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
        </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
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

import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { UserCheck, Plus, Edit2, Trash2, Search, Loader2, X, FileSpreadsheet, Upload, Download, AlertTriangle, Shield } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import { fetchDaftarPegawaiAktif, fetchWilayahList, tambahPegawai, tambahPegawaiBulk, updatePegawai, hapusPegawai, cariUidByEmail } from '../../services/adminService';
import { formatHP } from '../../services/wabotLokalService';
import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';

/**
 * Normalize nomor HP untuk cek duplikat
 * Hilangkan spasi, dash, dll
 */
function normalizeHP(hp) {
  if (!hp) return '';
  return String(hp).replace(/[\s\-\(\)]/g, '');
}

function KelolaPegawaiContent({ adminProfile }) {
  const queryClient = useQueryClient();
  const isKabKotaAdmin = adminProfile?.role_admin === 'ADMIN_KABKOTA';
  const isProvinsiAdmin = adminProfile?.role_admin === 'ADMIN_PROVINSI';
  const defaultWilayahId = (isKabKotaAdmin || isProvinsiAdmin) ? String(adminProfile.wilayah_id) : '';

  const [wilayahFilter, setWilayahFilter] = useState(defaultWilayahId);
  const [kataKunci, setKataKunci] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [error, setError] = useState(null);

  // State Modal Form (Tambah / Edit)
  const [isSearchingUid, setIsSearchingUid] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    nama: '',
    nip: '',
    nip_baru: '',
    email: '',
    no_hp: '',
    foto_url: '',
    golongan: '',
    jabatan: '',
    unit_kerja: '',
    wilayah_id: defaultWilayahId,
    role_admin: 'USER_BIASA',
    is_kakan: false,
    is_active: true,
  });

  // State Modal Import CSV Bulk
  const [showImportModal, setShowImportModal] = useState(false);
  const [importWilayahId, setImportWilayahId] = useState(defaultWilayahId);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const fileInputRef = useRef(null);

  // State Modal Hapus
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // State Duplicate HP Warning
  const [hpDuplicateWarning, setHpDuplicateWarning] = useState(null);

  const { data: rawWilayahList = [] } = useQuery({ queryKey: ['wilayah-list'], queryFn: fetchWilayahList });
  
  // Filter daftar wilayah berdasarkan hak akses Admin
  const wilayahList = useMemo(() => {
    if (isKabKotaAdmin) {
      return rawWilayahList.filter(w => String(w.id) === String(adminProfile.wilayah_id));
    }
    if (isProvinsiAdmin) {
      // Admin Provinsi hanya boleh melihat wilayahnya sendiri dan Kab/Kota di bawahnya
      return rawWilayahList.filter(w => 
        String(w.id) === String(adminProfile.wilayah_id) || 
        String(w.parent_id) === String(adminProfile.wilayah_id)
      );
    }
    return rawWilayahList; // SUPER_ADMIN melihat semua
  }, [rawWilayahList, adminProfile, isKabKotaAdmin, isProvinsiAdmin]);

  // Fetch semua pegawai untuk cek duplikat HP
  const { data: semuaPegawai = [] } = useQuery({
    queryKey: ['pegawai-all-for-duplicate-check'],
    queryFn: async () => {
      return fetchDaftarPegawaiAktif(null, '', false, false);
    },
  });

  /**
   * Cek duplikat nomor HP
   */
  function checkDuplicateHP(noHp, excludeId = null) {
    if (!noHp) {
      setHpDuplicateWarning(null);
      return false;
    }

    const normalizedInput = normalizeHP(noHp);

    // Cari pegawai dengan HP yang sama
    const duplikat = semuaPegawai.find(p => {
      if (excludeId && p.id === excludeId) return false;
      if (!p.no_hp) return false;
      return normalizeHP(p.no_hp) === normalizedInput;
    });

    if (duplikat) {
      setHpDuplicateWarning({
        nama: duplikat.nama,
        nip: duplikat.nip_baru || duplikat.nip,
        unit_kerja: duplikat.unit_kerja,
      });
      return true;
    }

    setHpDuplicateWarning(null);
    return false;
  }

  const activeWilayahFilter = isKabKotaAdmin ? Number(adminProfile.wilayah_id) : (wilayahFilter ? Number(wilayahFilter) : null);

  const { data: pegawaiList = [], isLoading } = useQuery({
    queryKey: ['pegawai-list', activeWilayahFilter, kataKunci],
    queryFn: () => fetchDaftarPegawaiAktif(activeWilayahFilter, kataKunci, true, false),
  });

  const totalPages = Math.ceil(pegawaiList.length / itemsPerPage);
  const paginatedPegawai = useMemo(() => {
    return pegawaiList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [pegawaiList, currentPage]);

  const mutasiSimpan = useMutation({
    mutationFn: (payload) => (editId ? updatePegawai(editId, payload) : tambahPegawai(payload)),
    onSuccess: () => {
      tutupModal();
      queryClient.invalidateQueries({ queryKey: ['pegawai-list'] });
    },
    onError: (err) => setError(err.message),
  });

  const mutasiImportBulk = useMutation({
    mutationFn: (rows) => tambahPegawaiBulk(rows),
    onSuccess: (res) => {
      toast.success(`Berhasil mengimpor ${res.length} pegawai!`);
      tutupImportModal();
      queryClient.invalidateQueries({ queryKey: ['pegawai-list'] });
    },
    onError: (err) => setError(err.message),
  });

  const mutasiHapus = useMutation({
    mutationFn: (id) => hapusPegawai(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pegawai-list'] });
      toast.success(`Pegawai "${deleteTarget?.nama}" berhasil dihapus.`);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(`Gagal menghapus pegawai: ${err.message}`);
      setDeleteTarget(null);
    },
  });

  function handleDeleteClick(p) {
    setDeleteTarget(p);
    setShowDeleteModal(true);
  }

  function confirmDelete() {
    setShowDeleteModal(false);
    mutasiHapus.mutate(deleteTarget.id);
  }

  function bukaModalTambah() {
    setEditId(null);
    setFormData({
      user_id: '',
      nama: '',
      nip: '',
      nip_baru: '',
      email: '',
      no_hp: '',
      foto_url: '',
      golongan: '',
      jabatan: '',
      unit_kerja: '',
      wilayah_id: isKabKotaAdmin ? String(adminProfile.wilayah_id) : (wilayahList[0]?.id || ''),
      role_admin: 'USER_BIASA',
      is_kakan: false,
      is_active: true,
    });
    setHpDuplicateWarning(null);
    setError(null);
    setShowModal(true);
  }

  function bukaModalEdit(p) {
    setEditId(p.id);
    setFormData({
      user_id: p.user_id || '',
      nama: p.nama || '',
      nip: p.nip || '',
      nip_baru: p.nip_baru || '',
      email: p.email || '',
      no_hp: p.no_hp || '',
      foto_url: p.foto_url || '',
      golongan: p.golongan || '',
      jabatan: p.jabatan || '',
      unit_kerja: p.unit_kerja || '',
      wilayah_id: isKabKotaAdmin ? String(adminProfile.wilayah_id) : (p.wilayah_id || ''),
      role_admin: p.role_admin || 'USER_BIASA',
      is_kakan: Boolean(p.is_kakan),
      is_active: p.is_active ?? true,
    });
    setHpDuplicateWarning(null);
    setError(null);
    setShowModal(true);
  }

  function tutupModal() {
    setShowModal(false);
    setEditId(null);
    setHpDuplicateWarning(null);
  }



  function handleNoHpChange(value) {
    setFormData({ ...formData, no_hp: value });
    checkDuplicateHP(value, editId);
  }

  function bukaImportModal() {
    setImportWilayahId(wilayahList[0]?.id || '');
    setCsvText('');
    setParsedRows([]);
    setError(null);
    setShowImportModal(true);
  }

  function tutupImportModal() {
    setShowImportModal(false);
    setCsvText('');
    setParsedRows([]);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        prosesParseCSV(content, importWilayahId);
      }
    };
    reader.readAsText(file);
  }

  function prosesParseCSV(text, fallbackWilayahId) {
    if (!text.trim()) return;
    const lines = text.split(/\r?\n/);
    const parsed = [];
    const seenNip = new Set();
    const seenNipBaru = new Set();
    const seenHp = new Set();

    const existingHP = new Map();
    semuaPegawai.forEach(p => {
      if (p.no_hp) {
        const normalized = normalizeHP(p.no_hp);
        existingHP.set(normalized, { nama: p.nama, nip: p.nip_baru || p.nip, unit_kerja: p.unit_kerja });
      }
    });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (i === 0 && (line.toLowerCase().includes('nama') || line.toLowerCase().includes('nip'))) {
        continue;
      }

      const delimiter = line.includes(';') ? ';' : ',';
      const regexDelimiter = new RegExp(`\\s*${delimiter}\\s*(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      const cols = line.split(regexDelimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const nama = cols[0];
      if (!nama) continue;

      const nip = cols[1] || null;
      const nipBaru = cols[2] || null;
      const email = cols[3] || null;
      const noHp = cols[4] || null;
      const golongan = cols[5] || null;
      const jabatan = cols[6] || null;
      const unitKerja = cols[7] || null;
      const fotoUrl = cols[8] || null;
      const kodeWilayah = cols[9] || null;

      let rowStatus = 'VALID';
      let errorMsg = '';
      let warningMsg = '';
      let resolvedWilayahId = fallbackWilayahId ? Number(fallbackWilayahId) : null;
      let resolvedWilayahNama = '';

      if (kodeWilayah) {
        const matchW = wilayahList.find((w) => String(w.kode_wilayah).trim() === String(kodeWilayah).trim());
        if (matchW) {
          resolvedWilayahId = matchW.id;
          resolvedWilayahNama = matchW.nama_unit_kerja || matchW.nama_wilayah;
        } else {
          rowStatus = 'ERROR';
          errorMsg = `Kode Wilayah "${kodeWilayah}" tidak terdaftar.`;
        }
      } else if (fallbackWilayahId) {
        const fallbackW = wilayahList.find((w) => String(w.id) === String(fallbackWilayahId));
        resolvedWilayahNama = fallbackW ? (fallbackW.nama_unit_kerja || fallbackW.nama_wilayah) : '';
      } else {
        rowStatus = 'ERROR';
        errorMsg = 'Wilayah belum dipilih.';
      }

      if (nip && seenNip.has(nip)) {
        rowStatus = 'ERROR';
        errorMsg = `NIP Lama "${nip}" ganda.`;
      } else if (nip) {
        seenNip.add(nip);
      }

      if (nipBaru && seenNipBaru.has(nipBaru)) {
        rowStatus = 'ERROR';
        errorMsg = `NIP Baru "${nipBaru}" ganda.`;
      } else if (nipBaru) {
        seenNipBaru.add(nipBaru);
      }

      if (noHp) {
        const normalizedHp = normalizeHP(noHp);
        if (seenHp.has(normalizedHp)) {
          rowStatus = 'WARNING';
          warningMsg = `HP "${noHp}" ganda dengan data lain di CSV.`;
        } else {
          seenHp.add(normalizedHp);
        }
        if (existingHP.has(normalizedHp)) {
          const existing = existingHP.get(normalizedHp);
          warningMsg = `HP sudah dipakai: ${existing.nama} (${existing.nip || '-'}) - ${existing.unit_kerja}`;
        }
      }

      parsed.push({
        lineNum: i + 1,
        nama,
        nip: nip || null,
        nip_baru: nipBaru || null,
        email: email || null,
        no_hp: noHp || null,
        golongan: golongan || null,
        jabatan: jabatan || null,
        unit_kerja: unitKerja || null,
        foto_url: fotoUrl || null,
        kode_wilayah: kodeWilayah,
        wilayah_id: resolvedWilayahId,
        wilayah_nama: resolvedWilayahNama,
        status: rowStatus,
        errorMsg,
        warningMsg,
        role_admin: 'USER_BIASA',
        is_kakan: false,
        is_active: true,
      });
    }

    setParsedRows(parsed);
  }

  function handleDownloadTemplate() {
    const header = 'nama,nip,nip_baru,email,no_hp,golongan,jabatan,unit_kerja,foto_url,kode_wilayah\n';
    const sample = 'Ahmad Hidayat,19900101,199001012020121001,ahmad@kemenag.go.id,08123456789,III/a,Pengadministrasi Umum,Sekretariat,https://github.com/torvalds.png,3200\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_pegawai.csv';
    a.click();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const targetWilayahId = isKabKotaAdmin ? Number(adminProfile.wilayah_id) : Number(formData.wilayah_id);
    if (!formData.nama.trim() || !targetWilayahId) {
      setError('Nama dan Wilayah wajib diisi.');
      return;
    }
    
    // Auto-detect role_admin based on the toggle and wilayah level
    let finalRoleAdmin = 'USER_BIASA';
    if (formData.role_admin && formData.role_admin !== 'USER_BIASA') {
      const targetW = wilayahList.find((w) => String(w.id) === String(targetWilayahId));
      if (targetW) {
        finalRoleAdmin = targetW.level === 'PROVINSI' ? 'ADMIN_PROVINSI' : 'ADMIN_KABKOTA';
      }
    }

    const { unit_kerja, wilayah, ...cleanFormData } = formData;
    const payload = { ...cleanFormData, user_id: formData.user_id?.trim() || null, wilayah_id: targetWilayahId, role_admin: finalRoleAdmin };
    
    // Konversi string kosong menjadi null agar tidak gagal validasi di Supabase
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null;
    });

    mutasiSimpan.mutate(payload);
  }

  function handleSubmitImport(e) {
    e.preventDefault();
    const validRowsToSubmit = parsedRows.filter((r) => r.status === 'VALID' || r.status === 'WARNING').map(({ lineNum, status, errorMsg, warningMsg, wilayah_nama, kode_wilayah, unit_kerja, ...payload }) => payload);
    if (validRowsToSubmit.length === 0) {
      setError('Tidak ada data valid untuk diimpor.');
      return;
    }
    setError(null);
    mutasiImportBulk.mutate(validRowsToSubmit);
  }

  const countValid = parsedRows.filter((r) => r.status === 'VALID').length;
  const countWarning = parsedRows.filter((r) => r.status === 'WARNING').length;
  const countError = parsedRows.filter((r) => r.status === 'ERROR').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900">Master Pegawai</h2>
          <p className="text-sm text-slate-500 mt-1">Kelola data pegawai dalam sistem</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={bukaImportModal} className="btn-secondary">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Import CSV
          </button>
          <button type="button" onClick={bukaModalTambah} className="btn-primary">
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-shake">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={kataKunci}
            onChange={(e) => {
              setKataKunci(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama, NIP, atau nomor HP..."
            className="input pl-10"
          />
        </div>
        <select
          disabled={isKabKotaAdmin}
          value={isKabKotaAdmin ? String(adminProfile.wilayah_id) : wilayahFilter}
          onChange={(e) => {
            setWilayahFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="input"
        >
          <option value="">Semua Wilayah</option>
          {wilayahList.map((w) => (
            <option key={w.id} value={w.id}>{w.nama_wilayah} ({w.level})</option>
          ))}
        </select>
      </div>

      <div className="table-container overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Pegawai</th>
              <th className="px-4 py-3">NIP</th>
              <th className="px-4 py-3">No. HP</th>
              <th className="px-4 py-3">Unit Kerja</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                </td>
              </tr>
            ) : pegawaiList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada data</td>
              </tr>
            ) : (
              paginatedPegawai.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.foto_url || (p.nip ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${p.nip}.jpg` : null)}
                        alt={p.nama}
                        className="h-10 w-10 rounded-full object-cover border border-slate-200 shadow-sm"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama)}&background=16324a&color=fff&size=64`;
                        }}
                      />
                      <div>
                        <p className="font-semibold text-navy-900">{p.nama}</p>
                        <p className="text-xs text-slate-500">{p.jabatan || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{p.nip_baru || p.nip || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.no_hp ? (
                      <span className="font-mono text-xs text-slate-600">{p.no_hp}</span>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{p.unit_kerja}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.role_admin === 'SUPER_ADMIN' ? 'badge-danger' : p.role_admin === 'ADMIN_PROVINSI' ? 'bg-blue-100 text-blue-800' : p.role_admin === 'ADMIN_KABKOTA' ? 'badge-success' : 'bg-slate-100 text-slate-600'}`}>
                      {p.role_admin}
                    </span>
                    {p.is_kakan && <span className="ml-1 badge bg-purple-100 text-purple-800">KAKAN</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="badge badge-success">Aktif</span>
                    ) : (
                      <span className="badge badge-danger">Tidak Aktif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => bukaModalEdit(p)} className="rounded-lg p-2 text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteClick(p)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
            </tbody>
        </table>
        </div>

        {!isLoading && pegawaiList.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={pegawaiList.length}
            itemsPerPage={itemsPerPage}
          />
        )}

      <Modal
        isOpen={showModal}
        onClose={tutupModal}
        title={`${editId ? 'Edit' : 'Tambah'} Pegawai`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama</label>
            <input type="text" required value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">NIP Baru</label>
              <input type="text" value={formData.nip_baru} onChange={(e) => setFormData({ ...formData, nip_baru: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">NIP Lama</label>
              <input type="text" value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">No. HP (WhatsApp)</label>
              <input
                type="text"
                value={formData.no_hp}
                onChange={(e) => handleNoHpChange(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={`input ${hpDuplicateWarning ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              {hpDuplicateWarning && (
                <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Nomor HP sudah digunakan:</p>
                      <p className="text-amber-700 mt-0.5">
                        {hpDuplicateWarning.nama} ({hpDuplicateWarning.nip || '-'})
                        {hpDuplicateWarning.unit_kerja && <span className="text-amber-600"> - {hpDuplicateWarning.unit_kerja}</span>}
                      </p>
                      <p className="text-amber-600 mt-1">Data tetap akan disimpan.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Wilayah</label>
            <select required disabled={isKabKotaAdmin} value={isKabKotaAdmin ? String(adminProfile.wilayah_id) : formData.wilayah_id} onChange={(e) => setFormData({ ...formData, wilayah_id: e.target.value })} className="input">
              <option value="">Pilih...</option>
              {wilayahList.map((w) => (
                <option key={w.id} value={w.id}>{w.nama_unit_kerja ? `${w.nama_unit_kerja} (${w.nama_wilayah})` : w.nama_wilayah}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Jabatan</label>
              <input type="text" value={formData.jabatan} onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Golongan</label>
              <input type="text" value={formData.golongan} onChange={(e) => setFormData({ ...formData, golongan: e.target.value })} className="input" />
            </div>
          </div>
          
          <div className="border-t pt-4 mt-2">
            <h4 className="text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-navy-500" />
              Akses Sistem & Role
            </h4>
            <div className="space-y-4">
              {/* Dropdown Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Peran Pegawai</label>
                <select 
                  className="input cursor-pointer"
                  value={formData.is_kakan ? 'KAKAN' : (formData.role_admin && formData.role_admin !== 'USER_BIASA' ? 'ADMIN' : 'BIASA')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'BIASA') {
                      setFormData(prev => ({ ...prev, role_admin: 'USER_BIASA', is_kakan: false }));
                    } else if (val === 'ADMIN') {
                      setFormData(prev => ({ ...prev, role_admin: 'ADMIN_KABKOTA', is_kakan: false }));
                    } else if (val === 'KAKAN') {
                      setFormData(prev => ({ ...prev, role_admin: 'USER_BIASA', is_kakan: true }));
                    }
                  }}
                >
                  <option value="BIASA">Pegawai Biasa (Hanya Peserta / Voter)</option>
                  <option value="ADMIN">Administrator (Pengelola Data & Periode)</option>
                  <option value="KAKAN">Kepala Kantor (Pimpinan Pengambil Keputusan)</option>
                </select>
                
                {/* Dynamic Help Text based on selection */}
                {formData.is_kakan ? (
                  <p className="mt-2 text-xs text-slate-500">
                    <strong className="text-navy-600">Kepala Kantor:</strong> Memberikan akses dasbor khusus untuk memantau rekapitulasi nilai dan menetapkan juara final.
                  </p>
                ) : (formData.role_admin && formData.role_admin !== 'USER_BIASA') ? (
                  <p className="mt-2 text-xs text-slate-500">
                    <strong className="text-navy-600">Administrator:</strong> Berwenang mengelola data pegawai dan jadwal pemilihan. Akan otomatis menjadi Admin Provinsi atau Kab/Kota sesuai wilayah di atas.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    <strong className="text-slate-600">Pegawai Biasa:</strong> Tidak memiliki hak akses ke Dasbor Pengelola.
                  </p>
                )}
              </div>

              {/* Input Auth UID - Tampil hanya jika Admin atau Kakan */}
              {(formData.is_kakan || (formData.role_admin !== 'USER_BIASA' && !!formData.role_admin)) && (
                <div className="animate-fade-in bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Auth User ID (UID Supabase)
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.user_id} 
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} 
                      placeholder="Paste UID dari menu Supabase Authentication"
                      className="input bg-white flex-1" 
                    />
                    <button
                      type="button"
                      disabled={isSearchingUid || !formData.email}
                      onClick={async () => {
                        if (!formData.email) return;
                        setIsSearchingUid(true);
                        const uid = await cariUidByEmail(formData.email);
                        if (uid) {
                          setFormData(prev => ({ ...prev, user_id: uid }));
                        } else {
                          toast.error(`Akun login untuk email ${formData.email} tidak ditemukan di database Supabase.`);
                        }
                        setIsSearchingUid(false);
                      }}
                      className="btn-secondary whitespace-nowrap !px-3"
                      title="Cari UID otomatis berdasarkan email"
                    >
                      {isSearchingUid ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : <Search className="h-4 w-4 text-slate-500" />}
                      <span className="ml-1.5 text-sm font-medium">Cari via Email</span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Wajib diisi agar Admin / Kakan bisa login ke dashboard.
                  </p>
                </div>
              )}

              {/* Toggle Aktif */}
              <div className="flex items-start pt-3 border-t border-slate-100">
                <div className="flex h-6 items-center mr-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_active}
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`${formData.is_active ? 'bg-emerald-500' : 'bg-slate-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`}
                  >
                    <span aria-hidden="true" className={`${formData.is_active ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                </div>
                <div className="text-sm leading-6">
                  <label className="font-medium text-slate-900 cursor-pointer" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                    Status Pegawai Aktif
                  </label>
                  <p className="text-slate-500">Nonaktifkan sakelar ini untuk <i>soft delete</i> (pegawai disembunyikan dari daftar pilihan).</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={tutupModal} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutasiSimpan?.isPending} className="btn-primary">
              {mutasiSimpan?.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editId ? 'Simpan Perubahan' : 'Tambah Pegawai'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-xl">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold">Import Masal CSV</h2>
                    <p className="text-xs text-emerald-100">Impor data pegawai dari file CSV</p>
                  </div>
                </div>
                <button onClick={tutupImportModal} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmitImport} className="p-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs text-emerald-800">Unduh template CSV</p>
                <button type="button" onClick={handleDownloadTemplate} className="btn-secondary text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Template
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Wilayah Default</label>
                <select disabled={isKabKotaAdmin} value={isKabKotaAdmin ? String(adminProfile.wilayah_id) : importWilayahId} onChange={(e) => { setImportWilayahId(e.target.value); if (csvText) prosesParseCSV(csvText, e.target.value); }} className="input">
                  <option value="">Pilih...</option>
                  {wilayahList.map((w) => (
                    <option key={w.id} value={w.id}>{w.nama_unit_kerja || w.nama_wilayah}</option>
                  ))}
                </select>
              </div>
              <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 hover:border-emerald-400 transition-colors">
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">Klik atau seret file CSV ke sini</p>
              </div>
              {parsedRows.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs mb-2 flex items-center gap-2">
                    <span className="text-emerald-600">{countValid} valid</span>
                    {countWarning > 0 && <span className="text-amber-600">{countWarning} warning</span>}
                    {countError > 0 && <span className="text-red-600">{countError} error</span>}
                  </p>
                  {parsedRows.map((row, idx) => (
                    <div
                      key={idx}
                      className={`text-xs py-1 px-2 rounded mb-1 ${
                        row.status === 'ERROR'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : row.status === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'text-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-medium">{row.nama}</span>
                        {row.no_hp && <span className="text-slate-500">({row.no_hp})</span>}
                        <span className="ml-auto text-[10px]">
                          {row.status === 'ERROR' && row.errorMsg}
                          {row.status === 'WARNING' && row.warningMsg}
                          {row.status === 'VALID' && 'OK'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={tutupImportModal} className="btn-secondary">Batal</button>
                <button type="submit" disabled={mutasiImportBulk.isPending || (countValid + countWarning) === 0} className="btn-gold">
                  {mutasiImportBulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import {countValid + countWarning} Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Hapus Pegawai"
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.nama}"? Data pegawai ini beserta riwayat penilaiannya akan dihapus permanen.`}
      />
    </div>
  );
}

export default function KelolaPegawai() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <KelolaPegawaiContent adminProfile={adminProfile} />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

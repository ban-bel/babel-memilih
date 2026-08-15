import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../config/supabaseClient';
import AdminLoginGate from './components/AdminLoginGate';
import AdminLayout from './components/AdminLayout';
import { Mail, MessageCircle, Smartphone, RefreshCw, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Pagination from '../../components/common/Pagination';

export default function KotakKeluar() {
  const [filterType, setFilterType] = useState('ALL'); // ALL, EMAIL, WA_BOT, WA_ME
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch Email Logs
  const fetchEmailLogs = async () => {
    const { data, error } = await supabase
      .from('log_notifikasi_email')
      .select('*, pegawai(nama, nip_baru)')
      .order('sent_at', { ascending: false });
    
    if (error) throw error;
    return data.map(d => ({ ...d, type: 'EMAIL' }));
  };

  // Fetch WA Logs
  const fetchWaLogs = async () => {
    const { data, error } = await supabase
      .from('log_notifikasi_wa')
      .select('*, pegawai(nama, nip_baru)')
      .order('sent_at', { ascending: false });
    
    if (error) throw error;
    return data.map(d => ({ ...d, type: d.status === 'WA.ME' ? 'WA_ME' : 'WA_BOT' }));
  };

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['outbox-logs'],
    queryFn: async () => {
      try {
        const [emailLogs, waLogs] = await Promise.all([
          fetchEmailLogs().catch(() => []), // Fallback if table doesn't exist yet
          fetchWaLogs().catch(() => [])
        ]);
        
        // Helper to parse dates securely as UTC if timezone is missing
        const parseDateUTC = (d) => {
          if (!d) return 0;
          if (d.includes('T') && !/(Z|[+-]\d{2}:\d{2})$/.test(d)) return new Date(d + 'Z').getTime();
          return new Date(d).getTime();
        };

        // Merge and sort descending
        const merged = [...emailLogs, ...waLogs].sort((a, b) => {
          return parseDateUTC(b.sent_at) - parseDateUTC(a.sent_at);
        });
        
        return merged;
      } catch (err) {
        console.error(err);
        return [];
      }
    }
  });

  const filteredLogs = (logs || []).filter(log => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'EMAIL': return <Mail className="h-4 w-4 text-amber-500" />;
      case 'WA_BOT': return <MessageCircle className="h-4 w-4 text-emerald-500" />;
      case 'WA_ME': return <Smartphone className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'EMAIL': return 'Email (SMTP)';
      case 'WA_BOT': return 'WA Bot (Bulk)';
      case 'WA_ME': return 'WA Manual (Wa.me)';
      default: return type;
    }
  };

  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout title="Kotak Keluar (Outbox)" adminProfile={adminProfile}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header & Filter */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
              {['ALL', 'EMAIL', 'WA_BOT', 'WA_ME'].map((type) => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setPage(1); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterType === type 
                      ? 'bg-white text-navy-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {type === 'ALL' ? 'Semua Pesan' : getTypeLabel(type)}
                </button>
              ))}
            </div>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Waktu Terkirim</th>
                  <th className="px-6 py-4">Penerima</th>
                  <th className="px-6 py-4">Jenis Pesan</th>
                  <th className="px-6 py-4">Target (Email/HP)</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Memuat riwayat...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Tidak ada riwayat pengiriman untuk kategori ini.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    let dateStr = log.sent_at;
                    if (dateStr && dateStr.includes('T') && !/(Z|[+-]\d{2}:\d{2})$/.test(dateStr)) {
                      dateStr += 'Z';
                    }
                    return (
                      <tr key={log.id + log.type} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                          {new Date(dateStr).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                            timeZoneName: 'short'
                          })}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-700">
                          {log.pegawai?.nama || 'Unknown'}
                          <div className="text-xs text-slate-400 font-normal">{log.kategori || '-'}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(log.type)}
                            <span>{getTypeLabel(log.type)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-slate-500">
                          {log.email_tujuan || log.nomor_hp || log.nomor_tujuan || '-'}
                        </td>
                        <td className="px-6 py-3">
                          {log.status === 'FAILED' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium" title={log.error_message}>
                              <XCircle className="h-3.5 w-3.5" />
                              GAGAL
                            </div>
                          ) : log.status === 'WA.ME' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              DIKLIK
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              SUKSES
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}
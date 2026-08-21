import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function PortofolioViewer({ portofolio, type, title, icon }) {
  if (!portofolio || !Array.isArray(portofolio) || portofolio.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-white overflow-hidden">
      <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
        <h4 className="flex items-center gap-2 text-sm font-bold text-blue-900">
          <span>{icon}</span> {title}
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            {type === 'portofolio_pengembangan' && (
              <tr>
                <th className="px-4 py-3 font-semibold">Bentuk</th>
                <th className="px-4 py-3 font-semibold text-center">Tahun</th>
                <th className="px-4 py-3 font-semibold">Penyelenggara</th>
                <th className="px-4 py-3 font-semibold text-center">Bukti</th>
              </tr>
            )}
            {type === 'portofolio_inovasi' && (
              <tr>
                <th className="px-4 py-3 font-semibold">Inovasi</th>
                <th className="px-4 py-3 font-semibold">Cakupan</th>
                <th className="px-4 py-3 font-semibold text-center">Tahun</th>
                <th className="px-4 py-3 font-semibold text-center">Bukti</th>
              </tr>
            )}
            {type === 'portofolio_penghargaan' && (
              <tr>
                <th className="px-4 py-3 font-semibold">Penghargaan</th>
                <th className="px-4 py-3 font-semibold">Pemberi</th>
                <th className="px-4 py-3 font-semibold text-center">Tahun</th>
                <th className="px-4 py-3 font-semibold text-center">Bukti</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {portofolio.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                {type === 'portofolio_pengembangan' && (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.bentuk || '-'}</td>
                    <td className="px-4 py-3 text-center">{item.tahun || '-'}</td>
                    <td className="px-4 py-3">{item.penyelenggara || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">
                          <ExternalLink className="h-3 w-3" /> Buka
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </>
                )}
                {type === 'portofolio_inovasi' && (
                  <>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.nama || '-'}</div>
                      <div className="text-xs text-slate-500">{item.bentuk}</div>
                      {item.deskripsi && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{item.deskripsi}</div>}
                    </td>
                    <td className="px-4 py-3">{item.cakupan || '-'}</td>
                    <td className="px-4 py-3 text-center">{item.tahun || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">
                          <ExternalLink className="h-3 w-3" /> Buka
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </>
                )}
                {type === 'portofolio_penghargaan' && (
                  <>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{item.nama || '-'}</div>
                      {item.deskripsi && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{item.deskripsi}</div>}
                    </td>
                    <td className="px-4 py-3">{item.pemberi || '-'}</td>
                    <td className="px-4 py-3 text-center">{item.tahun || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">
                          <ExternalLink className="h-3 w-3" /> Buka
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

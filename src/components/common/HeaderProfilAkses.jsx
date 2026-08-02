/**
 * @fileoverview Header komponen untuk halaman Link Unik (Penilai, Juri, Nominee).
 *
 * Menampilkan:
 * - Avatar dengan badge verifikasi
 * - Nama dan role user
 * - NIP dan unit kerja
 * - Nama periode
 * - Warning box tentang kerahasiaan data
 *
 * DESAIN:
 * - Kartu dengan gradient ribbon navy
 * - Badge emas untuk elemen visual pembeda
 * - Pola "kartu penilaian resmi"
 *
 * @module components/common/HeaderProfilAkses
 */

import { Building2, IdCard, ShieldCheck } from 'lucide-react';

import { MODE_PENILAIAN_LABEL } from '../../utils/constants';
import WarningBox from './WarningBox';

/**
 * Header profil untuk halaman token akses.
 *
 * Menampilkan identitas user yang sedang mengakses halaman:
 * - Avatar dengan shield badge
 * - Nama dan mode penilaian
 * - NIP dan unit kerja
 * - Warning kerahasiaan
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {Object} props.profil - Data profil pegawai
 * @param {string} [props.profil.nama] - Nama lengkap
 * @param {string} [props.profil.nip] - NIP lama 9 digit
 * @param {string} [props.profil.nip_baru] - NIP baru 15 digit
 * @param {string} [props.profil.unit_kerja] - Unit kerja
 * @param {string} [props.profil.jabatan] - Jabatan
 * @param {string} [props.profil.foto_url] - URL foto profil
 * @param {string} props.modePenilaian - Mode penilaian (MODE_1A, MODE_1B, MODE_2)
 * @param {string} props.namaPeriode - Nama periode penilaian
 *
 * @example
 * // Penggunaan di halaman token
 * <HeaderProfilAkses
 *   profil={akses.penilai}
 *   modePenilaian={akses.periode.mode_penilaian}
 *   namaPeriode={akses.periode.nama_periode}
 * />
 */
export default function HeaderProfilAkses({ profil, modePenilaian, namaPeriode }) {
  // NIP untuk display (prioritas: nip_baru > nip_lama)
  const nipDisplay = profil?.nip_baru || profil?.nip || '-';
  // NIP lama 9 digit untuk avatar
  const nipAvatar = profil?.nip;

  return (
    <header className="mx-auto w-full max-w-2xl px-4 pt-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft-lg">
        {/* Gradient Ribbon */}
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-navy-800 via-navy-700 to-navy-800 h-full" />

          {/* Pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

          {/* Content */}
          <div className="relative flex items-start gap-4 border-l-4 border-gold-400 p-5">
            {/* Avatar dengan Shield Badge */}
            <div className="relative">
              <img
                src={
                  profil?.foto_url ||
                  (nipAvatar ? `https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress/${nipAvatar}.jpg` : null)
                }
                alt={`Foto ${profil?.nama ?? 'pegawai'}`}
                className="h-18 w-18 shrink-0 rounded-full border-3 border-gold-300 object-cover shadow-lg"
                style={{ width: '72px', height: '72px' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profil?.nama || 'Pegawai')}&background=16324a&color=fff&size=128`;
                }}
              />
              {/* Shield Badge */}
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-white shadow-lg">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              {/* Header Row: Nama + Badge Mode */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-xl font-bold text-white drop-shadow-sm">
                  {profil?.nama ?? '—'}
                </h1>
                <span className="inline-flex shrink-0 items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white border border-white/20">
                  {MODE_PENILAIAN_LABEL[modePenilaian] ?? modePenilaian}
                </span>
              </div>

              {/* Detail: NIP & Unit Kerja */}
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/80">
                <div className="flex items-center gap-1.5">
                  <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono text-xs">{nipDisplay}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate text-xs">{profil?.unit_kerja ?? '-'}</span>
                </div>
              </dl>

              {/* Nama Periode */}
              {namaPeriode && (
                <p className="mt-2 text-xs font-medium text-white/70">
                  {namaPeriode}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Warning Section */}
        <div className="border-t border-slate-100/50 bg-gradient-to-b from-slate-50/50 to-white p-4">
          <WarningBox
            variant="kuning"
            customClass="!rounded-xl !border-gold-200/50 !bg-gradient-to-r !from-gold-50/50 !to-gold-50/30"
          >
            Seluruh identitas &amp; jawaban Anda bersifat rahasia dan hanya digunakan untuk
            keperluan penilaian resmi. Link ini bersifat <strong>sekali pakai</strong> — setelah
            dikirim, Anda tidak dapat mengubah jawaban.
          </WarningBox>
        </div>
      </div>
    </header>
  );
}

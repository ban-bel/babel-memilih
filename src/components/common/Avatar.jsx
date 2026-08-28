/**
 * @fileoverview Shared Avatar Component dengan automatic fallback.
 *
 * Fitur:
 * - Priority: foto_url > GitHub (NIP lama) > ui-avatars.com
 * - Support berbagai ukuran
 * - Error handling otomatis
 * - Optional badge/shield overlay
 *
 * @module components/common/Avatar
 */

import { ShieldCheck } from 'lucide-react';

/**
 * Base URL untuk avatar GitHub repo
 * @type {string}
 */
const GITHUB_AVATAR_BASE_URL = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress';

/**
 * Ukuran preset untuk avatar
 * @readonly
 * @enum {Object}
 */
export const AVATAR_SIZE = Object.freeze({
  xs: { px: 24, text: 'text-[10px]', img: 'h-6 w-6' },
  sm: { px: 32, text: 'text-xs', img: 'h-8 w-8' },
  md: { px: 40, text: 'sm', img: 'h-10 w-10' },
  lg: { px: 48, text: 'base', img: 'h-12 w-12' },
  xl: { px: 64, text: 'lg', img: 'h-16 w-16' },
  '2xl': { px: 80, text: 'xl', img: 'h-20 w-20' },
});

/**
 * Mendapatkan URL avatar dengan priority fallback
 *
 * @param {Object} props
 * @param {string} [props.fotoUrl] - URL foto profil dari database
 * @param {string} [props.nip] - NIP lama 9 digit
 * @param {string} [props.nama] - Nama untuk fallback generator
 * @returns {string} URL avatar yang valid
 */
function getAvatarUrl({ fotoUrl, nip, nama }) {
  // Priority 1: foto_url dari database
  if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim()) {
    return fotoUrl;
  }

  // Priority 2: GitHub repo dengan NIP lama
  if (nip && typeof nip === 'string' && nip.length > 0) {
    return `${GITHUB_AVATAR_BASE_URL}/${nip}.jpg`;
  }

  // Priority 3: ui-avatars.com fallback
  const displayName = nama || 'Pegawai';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=16324a&color=fff&size=128`;
}

/**
 * Avatar Component dengan automatic fallback chain
 *
 * @component
 *
 * @param {Object} props - Props komponen
 * @param {Object} [props.pegawai] - Object pegawai dengan foto_url, nip, nama
 * @param {string} [props.fotoUrl] - URL foto langsung (alternative to pegawai prop)
 * @param {string} [props.nip] - NIP untuk GitHub lookup
 * @param {string} [props.nama] - Nama untuk fallback
 * @param {keyof AVATAR_SIZE} [props.size='md'] - Ukuran preset
 * @param {boolean} [props.showShield=false] - Tampilkan shield badge
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.alt] - Alt text (default: nama)
 * @param {Function} [props.onError] - Custom error handler
 *
 * @example
 * // Basic usage dengan pegawai object
 * <Avatar pegawai={data.pegawai} size="lg" />
 *
 * @example
 * // Dengan shield badge (verifikasi)
 * <Avatar pegawai={profil} size="md" showShield />
 *
 * @example
 * // Custom size dengan inline props
 * <Avatar fotoUrl={url} nama="John Doe" className="rounded-full" />
 */
export default function Avatar({
  pegawai,
  fotoUrl,
  nip,
  nama,
  size = 'md',
  showShield = false,
  className = '',
  alt,
  onError,
}) {
  // Extract props dari pegawai object jika tersedia
  const effectiveFotoUrl = fotoUrl || pegawai?.foto_url;
  const effectiveNip = nip || pegawai?.nip;
  const effectiveNama = nama || pegawai?.nama;
  const displayAlt = alt || effectiveNama || 'Avatar';

  // Get size preset
  const sizeConfig = AVATAR_SIZE[size] || AVATAR_SIZE.md;

  // Get avatar URL
  const avatarUrl = getAvatarUrl({
    fotoUrl: effectiveFotoUrl,
    nip: effectiveNip,
    nama: effectiveNama,
  });

  // Error handler
  const handleError = (e) => {
    // Fallback to ui-avatars if GitHub fails
    if (!e.target.src.includes('ui-avatars.com')) {
      e.target.onerror = null;
      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(effectiveNama || 'Pegawai')}&background=16324a&color=fff&size=128`;
    }
    onError?.(e);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={avatarUrl}
        alt={displayAlt}
        className={`${sizeConfig.img} rounded-full border-2 border-white object-cover shadow-md`}
        onError={handleError}
      />

      {/* Shield Badge */}
      {showShield && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-white shadow-lg ring-2 ring-white">
          <ShieldCheck className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

/**
 * Avatar dengan Inisial saja (tanpa gambar)
 * Cocok untuk loading state atau placeholder
 *
 * @component
 *
 * @param {Object} props
 * @param {string} [props.nama] - Nama untuk generate inisial
 * @param {keyof AVATAR_SIZE} [props.size='md']
 * @param {string} [props.className]
 */
export function AvatarInitial({ nama, size = 'md', className = '' }) {
  const sizeConfig = AVATAR_SIZE[size] || AVATAR_SIZE.md;

  // Generate initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div
      className={`${sizeConfig.img} flex items-center justify-center rounded-full bg-gradient-to-br from-navy-600 to-navy-800 text-white shadow-md ring-2 ring-white ${className}`}
    >
      <span className={`font-bold text-${sizeConfig.text}`}>
        {getInitials(nama)}
      </span>
    </div>
  );
}

/**
 * Avatar Group - menampilkan beberapa avatar dalam overlap
 *
 * @component
 *
 * @param {Object} props
 * @param {Object[]} props.pegawaiList - Array of pegawai objects
 * @param {number} [props.max=4] - Maximum avatars to show
 * @param {keyof AVATAR_SIZE} [props.size='sm']
 * @param {string} [props.className]
 */
export function AvatarGroup({ pegawaiList = [], max = 4, size = 'sm', className = '' }) {
  const visiblePegawai = pegawaiList.slice(0, max);
  const remaining = pegawaiList.length - max;

  return (
    <div className={`flex ${className}`}>
      {visiblePegawai.map((pegawai, index) => (
        <div
          key={pegawai.id || index}
          className="relative"
          style={{ marginLeft: index > 0 ? '-0.5rem' : '0' }}
        >
          <Avatar
            pegawai={pegawai}
            size={size}
            className="ring-2 ring-white"
          />
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={`${AVATAR_SIZE[size]?.img || 'h-8 w-8'} flex items-center justify-center rounded-full bg-slate-200 text-slate-600 shadow ring-2 ring-white`}
          style={{ marginLeft: '-0.5rem' }}
        >
          <span className="text-xs font-semibold">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

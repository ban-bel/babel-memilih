/**
 * votingConstants.js
 * Centralized constants for voter/penilai pages.
 * Previously scattered as inline strings across 6+ files.
 */

/** Base URL for avatar images from the BPS avatar GitHub repo */
export const GITHUB_AVATAR_BASE = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/Hasil_Compress';

/** Fallback UI Avatars API base URL (with BPS navy color scheme) */
export const UIAVATAR_BASE = 'https://ui-avatars.com/api/?background=16324a&color=fff&size=128';

/** Abstain / "tidak memilih" icon URL */
export const ABSTAIN_ICON_URL = 'https://raw.githubusercontent.com/ban-bel/avatar-bps/refs/heads/main/ikon-pegawai/tidak-memilih-rev.png';

/** Default score for PIONIR nominations */
export const DEFAULT_SKOR_PIONIR = 85;

/** Default weight for PIONIR nominations */
export const DEFAULT_BOBOT_PIONIR = 0.20;

/** Auto-save debounce delay in milliseconds (FormMode2 cloud sync) */
export const AUTO_SAVE_DEBOUNCE_MS = 7000;

/** Institution name used in footers and certificates */
export const NAMA_INSTANSI = 'BPS Provinsi Kepulauan Bangka Belitung';

/** Label for the "view profile" button shown on candidate cards */
export const KENALAN_BTN_LABEL = '👀 Kenalan Dulu Yuk';

/**
 * votingUtils.js
 * Shared utility functions for voter/penilai components.
 * Eliminates duplication across FormMode1A, FormMode2, GridMode1B,
 * GridPionirVote, FormPionirPengusul, and HeaderProfilAkses.
 */

import { GITHUB_AVATAR_BASE, UIAVATAR_BASE } from './votingConstants';

/**
 * Generates a composite key for a nominee+question/category scoring map.
 * Previously duplicated in FormMode1A.jsx and FormMode2.jsx.
 *
 * @param {number|string} nomineeId
 * @param {number|string} pertanyaanId
 * @returns {string}
 */
export function kunciSkor(nomineeId, pertanyaanId) {
  return `${nomineeId}:${pertanyaanId}`;
}

/**
 * Converts a YouTube watch/share URL into an embeddable iframe URL.
 * Previously duplicated in FormMode1A.jsx and FormMode2.jsx.
 *
 * @param {string|null|undefined} url
 * @returns {string}
 */
export function getEmbedUrl(url) {
  if (!url) return '';
  const videoIdMatch = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/
  );
  if (videoIdMatch && videoIdMatch[1]) {
    return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
  }
  return url;
}

/**
 * Resolves the best available photo URL for a person, with fallbacks:
 * 1. Custom foto_url from database
 * 2. GitHub avatar repo image by NIP
 * 3. UI Avatars generated initials avatar (navy/gold BPS theme)
 *
 * Previously duplicated inline in 6 different files. The Avatar.jsx component
 * encapsulates this logic for <img> elements, but this util is for cases where
 * we need the resolved URL string directly.
 *
 * @param {string|null|undefined} foto_url  - Direct URL from database
 * @param {string|null|undefined} nip       - Employee NIP number
 * @param {string|null|undefined} nama      - Full name (for fallback initials)
 * @returns {string}
 */
export function getFotoUrl(foto_url, nip, nama) {
  if (foto_url) return foto_url;
  if (nip) return `${GITHUB_AVATAR_BASE}/${nip}.jpg`;
  return `${UIAVATAR_BASE}&name=${encodeURIComponent(nama || 'N')}`;
}

/**
 * Returns an onError handler for <img> elements that falls back to
 * the UI Avatars service. Prevents infinite error loops.
 *
 * @param {string|null|undefined} nama - Full name for initials fallback
 * @returns {(e: React.SyntheticEvent) => void}
 */
export function getFotoErrorHandler(nama) {
  return (e) => {
    e.target.onerror = null;
    e.target.src = `${UIAVATAR_BASE}&name=${encodeURIComponent(nama || 'N')}`;
  };
}

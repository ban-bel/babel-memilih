import { supabase } from '../../config/supabaseClient';
import { pastikanTokenValid, tandaiTokenTerpakai, UUID_REGEX } from './shared';
import {
  STORAGE_BUCKET_BUKTI,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_FILE_TYPES
} from '../../utils/constants';

export async function uploadBuktiPDF(token, periodeId, nomineeId, pertanyaanId, file) {
  pastikanTokenValid(token);

  if (!file) {
    throw new Error('File belum dipilih.');
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File harus berformat PDF, Word (doc/docx), Excel (xls/xlsx), atau PowerPoint (ppt/pptx).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file melebihi batas maksimal 10MB.');
  }

  // Path: {periodeId}/{nomineeId}/{pertanyaanId}-{timestamp}.{ext}
  const fileExt = file.name.split('.').pop() || 'pdf';
  const path = `${periodeId}/${nomineeId}/${pertanyaanId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error(`Gagal mengunggah file PDF: ${uploadError.message}`);
  }

  const { error: rpcError } = await supabase.rpc('submit_jawaban_nominee', {
    p_token: token,
    p_pertanyaan_id: pertanyaanId,
    p_teks_jawaban: null,
    p_file_url: path,
  });

  if (rpcError) {
    throw new Error(
      `File berhasil diunggah, namun gagal menyimpan link ke database: ${rpcError.message}`
    );
  }

  return path;
}

/**
 * Upload dokumen bukti Mode 2 (satu file per nominee).
 *
 * Berbeda dari uploadBuktiPDF yang menyimpan ke jawaban_nominee (per pertanyaan),
 * fungsi ini menyimpan ke nominee_periode.file_url (satu file per nominee).
 *
 * FILE VALIDATION:
 * - Tipe: PDF, Word, Excel, PowerPoint
 * - Ukuran: Maksimal 10MB
 *
 * @async
 * @function submitBuktiNomineeMode2
 * @param {string} token - UUID token nominee dari URL
 * @param {File} file - Objek File dari input[type=file]
 * @returns {Promise<string>} Path file di storage
 * @throws {Error} Jika validasi gagal atau upload error
 *
 * @example
 * const path = await submitBuktiNomineeMode2(token, fileInput.files[0]);
 */

export async function submitBuktiNomineeMode2(token, file) {
  pastikanTokenValid(token);

  if (!file) {
    throw new Error('File belum dipilih.');
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('File harus berformat PDF, Word (doc/docx), Excel (xls/xlsx), atau PowerPoint (ppt/pptx).');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file melebihi batas maksimal 10MB.');
  }

  // Path: {timestamp}-{filename}
  const fileExt = file.name.split('.').pop() || 'pdf';
  const fileName = `${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .upload(fileName, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error(`Gagal mengunggah file: ${uploadError.message}`);
  }

  // Simpan path ke nominee_periode.file_url via RPC
  const { error: rpcError } = await supabase.rpc('submit_bukti_nominee_mode2', {
    p_token: token,
    p_file_url: fileName,
  });

  if (rpcError) {
    throw new Error(`File berhasil diunggah, namun gagal menyimpan ke database: ${rpcError.message}`);
  }

  return fileName;
}

/**
 * Ambil file_url bukti nominee Mode 2 dari nominee_periode.
 *
 * @async
 * @function fetchBuktiNomineeMode2
 * @param {number} periodeId - ID periode
 * @param {number} nomineeId - ID nominee
 * @returns {Promise<string|null>} Path file atau null
 */

export async function fetchBuktiNomineeMode2(periodeId, nomineeId) {
  const { data, error } = await supabase
    .from('nominee_periode')
    .select('file_url')
    .eq('periode_id', periodeId)
    .eq('pegawai_id', nomineeId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Gagal memuat bukti nominee: ${error.message}`);
  }
  return data?.file_url ?? null;
}

/**
 * Buat signed URL sementara untuk mengakses file bukti Mode 2.
 *
 * @async
 * @function getSignedUrlBuktiMode2
 * @param {string} fileName - Nama file di storage
 * @param {number} [expiresInSeconds=3600] - Masa berlaku URL (default 1 jam)
 * @returns {Promise<string>} Signed URL untuk download
 * @throws {Error} Jika gagal generate signed URL
 */

export async function getSignedUrlBuktiMode2(fileName, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .createSignedUrl(fileName, expiresInSeconds);

  if (error) {
    throw new Error(`Gagal membuat link akses file: ${error.message}`);
  }
  return data.signedUrl;
}

/**
 * Buat signed URL sementara untuk mengakses file bukti.
 *
 * @async
 * @function getSignedUrlBuktiPDF
 * @param {string} path - Path file di storage
 * @param {number} [expiresInSeconds=3600] - Masa berlaku URL (default 1 jam)
 * @returns {Promise<string>} Signed URL untuk download
 * @throws {Error} Jika gagal generate signed URL
 *
 * @example
 * const url = await getSignedUrlBuktiPDF('1/5/1-123456789.pdf');
 * // => 'https://xxx.supabase.co/storage/v1/object/sign/...?token=...'
 */

export async function getSignedUrlBuktiPDF(path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_BUKTI)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`Gagal membuat link akses file: ${error.message}`);
  }
  return data.signedUrl;
}

/**
 * Tandai token Nominee sebagai selesai/terpakai.
 *
 * PANGGIL HANYA SAAT nominee menekan tombol "Selesai & Kirim",
 * BUKAN otomatis di setiap submit jawaban/upload file.
 *
 * @async
 * @function selesaikanPengisianNominee
 * @param {string} token - UUID token nominee
 * @throws {Error} Jika gagal tandai token
 */
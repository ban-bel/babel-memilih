/**
 * @fileoverview Template WA Service
 *
 * CRUD operations untuk template pesan WhatsApp.
 *
 * @module services/templateWaService
 */

import { supabase } from '../config/supabaseClient';

/**
 * Ambil semua template WA yang aktif.
 *
 * @async
 * @returns {Promise<Array>} Array template
 */
export async function fetchTemplateWaAktif() {
  const { data, error } = await supabase
    .from('template_pesan_wa')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });

  if (error) throw new Error(`Gagal mengambil template: ${error.message}`);
  return data ?? [];
}

/**
 * Ambil semua template WA (termasuk nonaktif).
 *
 * @async
 * @returns {Promise<Array>} Array template
 */
export async function fetchSemuaTemplateWa() {
  console.log('[TemplateWaService] Fetching all templates...');
  const { data, error } = await supabase
    .from('template_pesan_wa')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('[TemplateWaService] Error:', error);
    throw new Error(`Gagal mengambil template: ${error.message}`);
  }
  console.log('[TemplateWaService] Data fetched:', data?.length, 'templates');
  return data ?? [];
}

/**
 * Tambah template WA baru.
 *
 * @async
 * @param {Object} template - Data template
 * @param {string} template.nama_tampilan - Nama/label template
 * @param {string} template.isi_pesan - Isi template dengan placeholder
 * @param {number} [template.created_by] - ID admin yang membuat
 * @returns {Promise<Object>} Template yang baru dibuat
 */
export async function tambahTemplateWa({ nama_tampilan, isi_pesan, created_by }) {
  const { data, error } = await supabase
    .from('template_pesan_wa')
    .insert({
      nama_tampilan,
      isi_pesan,
      is_active: true,
      created_by
    })
    .select()
    .single();

  if (error) throw new Error(`Gagal menambah template: ${error.message}`);
  return data;
}

/**
 * Update template WA.
 *
 * @async
 * @param {number} id - ID template
 * @param {Object} payload - Data yang diupdate
 * @param {string} [payload.nama_tampilan] - Nama baru
 * @param {string} [payload.isi_pesan] - Isi baru
 * @param {boolean} [payload.is_active] - Status aktif
 * @returns {Promise<Object>} Template yang sudah diupdate
 */
export async function updateTemplateWa(id, payload) {
  const { data, error } = await supabase
    .from('template_pesan_wa')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Gagal update template: ${error.message}`);
  return data;
}

/**
 * Hapus template WA.
 *
 * @async
 * @param {number} id - ID template
 * @returns {Promise<void>}
 */
export async function hapusTemplateWa(id) {
  const { error } = await supabase
    .from('template_pesan_wa')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Gagal menghapus template: ${error.message}`);
}

/**
 * Toggle status aktif/nonaktif template.
 *
 * @async
 * @param {number} id - ID template
 * @param {boolean} is_active - Status baru
 * @returns {Promise<Object>} Template yang sudah diupdate
 */
export async function toggleTemplateWaActive(id, is_active) {
  return updateTemplateWa(id, { is_active });
}

/**
 * Pilih 1 template secara random dari daftar template aktif.
 *
 * @param {Array} templates - Array template
 * @returns {Object|null} Template yang dipilih atau null jika kosong
 */
export function pilihTemplateRandom(templates) {
  if (!templates || templates.length === 0) return null;
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

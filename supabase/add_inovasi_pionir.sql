-- =============================================================================
-- MIGRASI DATABASE: DESKRIPSI INOVASI KANDIDAT MODE PIONIR
-- Tanggal: 2026-11-03
-- Deskripsi:
--   1. Menambahkan kolom `deskripsi_inovasi` (TEXT) pada `penilaian_pionir_pengusul`
--      (usulan asli per pengusul) dan `nominee_periode` (versi terkurasi/diedit Admin).
--   2. Memperbarui RPC `submit_usulan_pionir` untuk menerima `p_deskripsi_inovasi`.
--   3. Memperbarui `view_tabulasi_mode_pionir` & `get_kandidat_pionir_periode`
--      untuk menyajikan `deskripsi_inovasi` dan `inovasi_pengusul_raw`.
--   4. Menambahkan RPC `update_inovasi_kandidat_pionir` khusus Admin / Kepala Kantor.
-- =============================================================================

-- 1. Tambah kolom deskripsi_inovasi pada penilaian_pionir_pengusul & nominee_periode
ALTER TABLE public.penilaian_pionir_pengusul
ADD COLUMN IF NOT EXISTS deskripsi_inovasi TEXT;

ALTER TABLE public.nominee_periode
ADD COLUMN IF NOT EXISTS deskripsi_inovasi TEXT;

-- 2. Perbarui View Tabulasi Mode PIONIR
DROP VIEW IF EXISTS public.view_tabulasi_mode_pionir;

CREATE VIEW public.view_tabulasi_mode_pionir WITH (security_invoker=off) AS
WITH 
suara_pengusul_cte AS (
  SELECT 
    periode_id,
    kandidat_id,
    COUNT(DISTINCT pengusul_id) AS suara_pengusul
  FROM public.penilaian_pionir_pengusul
  GROUP BY periode_id, kandidat_id
),
suara_pemilih_cte AS (
  SELECT 
    periode_id,
    kandidat_id,
    COUNT(*) AS suara_pemilih
  FROM public.suara_pionir
  GROUP BY periode_id, kandidat_id
),
skor_kuesioner_per_pengusul AS (
  SELECT 
    ppp.periode_id,
    ppp.pengusul_id,
    ppp.kandidat_id,
    SUM(ppp.skor * COALESCE(p.bobot, 0.20)) AS skor_tertimbang_pengusul
  FROM public.penilaian_pionir_pengusul ppp
  JOIN public.pertanyaan p ON p.id = ppp.pertanyaan_id
  GROUP BY ppp.periode_id, ppp.pengusul_id, ppp.kandidat_id
),
rerata_kuesioner_cte AS (
  SELECT 
    periode_id,
    kandidat_id,
    ROUND(AVG(skor_tertimbang_pengusul), 2) AS rata_skor_kuesioner
  FROM skor_kuesioner_per_pengusul
  GROUP BY periode_id, kandidat_id
),
kata_kunci_cte AS (
  SELECT 
    periode_id,
    kandidat_id,
    STRING_AGG(DISTINCT TRIM(kata_kunci), ', ') FILTER (WHERE kata_kunci IS NOT NULL AND TRIM(kata_kunci) != '') AS kumpulan_kata
  FROM public.penilaian_pionir_pengusul
  GROUP BY periode_id, kandidat_id
),
inovasi_pengusul_cte AS (
  SELECT
    sub_ino.periode_id,
    sub_ino.kandidat_id,
    STRING_AGG(sub_ino.teks_inovasi, E'\n\n---\n\n' ORDER BY sub_ino.first_created_at ASC) AS kumpulan_inovasi
  FROM (
    SELECT
      ppp.periode_id,
      ppp.kandidat_id,
      ppp.pengusul_id,
      MAX(TRIM(ppp.deskripsi_inovasi)) AS teks_inovasi,
      MIN(ppp.created_at) AS first_created_at
    FROM public.penilaian_pionir_pengusul ppp
    WHERE ppp.deskripsi_inovasi IS NOT NULL AND TRIM(ppp.deskripsi_inovasi) != ''
    GROUP BY ppp.periode_id, ppp.kandidat_id, ppp.pengusul_id
  ) sub_ino
  GROUP BY sub_ino.periode_id, sub_ino.kandidat_id
),
total_suara_periode_cte AS (
  SELECT 
    pp.id AS periode_id,
    (
      COALESCE((SELECT COUNT(DISTINCT ppp2.pengusul_id) FROM public.penilaian_pionir_pengusul ppp2 WHERE ppp2.periode_id = pp.id), 0) +
      COALESCE((SELECT COUNT(*) FROM public.suara_pionir sp2 WHERE sp2.periode_id = pp.id), 0)
    ) AS total_suara_masuk
  FROM public.periode_penilaian pp
),
kandidat_gabungan AS (
  SELECT 
    np.periode_id,
    np.id AS nominee_periode_id,
    np.pegawai_id AS nominee_id,
    p.nama AS nama_nominee,
    p.nip,
    p.nip_baru,
    p.jabatan,
    w.nama_wilayah AS unit_kerja,
    p.foto_url,
    COALESCE(np.nilai_ckp, 0) AS nilai_ckp,
    COALESCE(sp.suara_pengusul, 0) AS jumlah_pengusul,
    COALESCE(sp.suara_pengusul, 0) AS suara_fase1,
    COALESCE(spm.suara_pemilih, 0) AS suara_fase2,
    (COALESCE(sp.suara_pengusul, 0) + COALESCE(spm.suara_pemilih, 0)) AS total_suara_kandidat,
    COALESCE(tsp.total_suara_masuk, 0) AS total_seluruh_suara,
    COALESCE(rk.rata_skor_kuesioner, 0) AS rata_skor_kuesioner,
    COALESCE(kk.kumpulan_kata, '') AS kata_pengusul,
    COALESCE(NULLIF(TRIM(np.deskripsi_inovasi), ''), ino.kumpulan_inovasi, '') AS deskripsi_inovasi,
    COALESCE(ino.kumpulan_inovasi, '') AS inovasi_pengusul_raw
  FROM public.nominee_periode np
  JOIN public.pegawai p ON p.id = np.pegawai_id
  LEFT JOIN public.wilayah w ON w.id = p.wilayah_id
  LEFT JOIN suara_pengusul_cte sp ON sp.periode_id = np.periode_id AND sp.kandidat_id = np.pegawai_id
  LEFT JOIN suara_pemilih_cte spm ON spm.periode_id = np.periode_id AND spm.kandidat_id = np.pegawai_id
  LEFT JOIN rerata_kuesioner_cte rk ON rk.periode_id = np.periode_id AND rk.kandidat_id = np.pegawai_id
  LEFT JOIN kata_kunci_cte kk ON kk.periode_id = np.periode_id AND kk.kandidat_id = np.pegawai_id
  LEFT JOIN inovasi_pengusul_cte ino ON ino.periode_id = np.periode_id AND ino.kandidat_id = np.pegawai_id
  LEFT JOIN total_suara_periode_cte tsp ON tsp.periode_id = np.periode_id
)
SELECT 
  kg.*,
  ROUND(
    CASE 
      WHEN kg.total_seluruh_suara > 0 THEN (kg.total_suara_kandidat::numeric / kg.total_seluruh_suara::numeric) * 40.0 
      ELSE 0 
    END, 2
  ) AS poin_suara,
  ROUND(kg.nilai_ckp * 0.40, 2) AS poin_ckp,
  ROUND(kg.rata_skor_kuesioner * 0.20, 2) AS poin_kuesioner,
  ROUND(
    (
      CASE 
        WHEN kg.total_seluruh_suara > 0 THEN (kg.total_suara_kandidat::numeric / kg.total_seluruh_suara::numeric) * 40.0 
        ELSE 0 
      END
    ) + (kg.nilai_ckp * 0.40) + (kg.rata_skor_kuesioner * 0.20), 2
  ) AS skor_akhir,
  DENSE_RANK() OVER (
    PARTITION BY kg.periode_id 
    ORDER BY (
      (
        CASE 
          WHEN kg.total_seluruh_suara > 0 THEN (kg.total_suara_kandidat::numeric / kg.total_seluruh_suara::numeric) * 40.0 
          ELSE 0 
        END
      ) + (kg.nilai_ckp * 0.40) + (kg.rata_skor_kuesioner * 0.20)
    ) DESC, kg.total_suara_kandidat DESC
  ) AS peringkat
FROM kandidat_gabungan kg;

ALTER VIEW public.view_tabulasi_mode_pionir OWNER TO postgres;
GRANT ALL ON TABLE public.view_tabulasi_mode_pionir TO anon, authenticated, service_role;

-- 3. Perbarui RPC submit_usulan_pionir (hapus signature 4-parameter lama agar tidak overload)
DROP FUNCTION IF EXISTS public.submit_usulan_pionir(UUID, BIGINT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.submit_usulan_pionir(
  p_token UUID,
  p_kandidat_id BIGINT,
  p_scores_json JSONB,
  p_kata_kunci TEXT,
  p_deskripsi_inovasi TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pengusul RECORD;
  v_periode RECORD;
  v_item JSONB;
  v_q_id BIGINT;
  v_skor NUMERIC;
  v_inovasi TEXT;
BEGIN
  SELECT * INTO v_pengusul 
  FROM public.pengusul_periode 
  WHERE token_akses = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token pengusul tidak valid.';
  END IF;

  IF v_pengusul.is_digunakan THEN
    RAISE EXCEPTION 'Anda sudah pernah mengirimkan usulan pada periode ini.';
  END IF;

  SELECT * INTO v_periode 
  FROM public.periode_penilaian 
  WHERE id = v_pengusul.periode_id;

  IF v_periode.status != 'BERJALAN' THEN
    RAISE EXCEPTION 'Periode pemilihan tidak aktif.';
  END IF;

  -- Anti self-nomination
  IF v_pengusul.pegawai_id = p_kandidat_id THEN
    RAISE EXCEPTION 'Pengusul tidak diperbolehkan mencalonkan diri sendiri.';
  END IF;

  -- Pengusul lain tidak boleh dicalonkan
  IF EXISTS (
    SELECT 1 FROM public.pengusul_periode 
    WHERE periode_id = v_pengusul.periode_id AND pegawai_id = p_kandidat_id
  ) THEN
    RAISE EXCEPTION 'Pegawai yang bertindak sebagai Pengusul tidak dapat dicalonkan.';
  END IF;

  -- Pengusul dan kandidat harus berasal dari kantor/wilayah kerja yang sama
  IF (SELECT wilayah_id FROM public.pegawai WHERE id = v_pengusul.pegawai_id) IS NOT NULL AND
     (SELECT wilayah_id FROM public.pegawai WHERE id = p_kandidat_id) IS NOT NULL AND
     (SELECT wilayah_id FROM public.pegawai WHERE id = v_pengusul.pegawai_id) <>
     (SELECT wilayah_id FROM public.pegawai WHERE id = p_kandidat_id) THEN
    RAISE EXCEPTION 'Kandidat harus berasal dari kantor/wilayah yang sama dengan Pengusul.';
  END IF;

  v_inovasi := NULLIF(TRIM(COALESCE(p_deskripsi_inovasi, '')), '');

  -- 1. Insert ke nominee_periode jika belum ada, atau gabungkan inovasi jika belum pernah diisi/berbeda
  INSERT INTO public.nominee_periode (periode_id, pegawai_id, deskripsi_inovasi, created_at)
  VALUES (v_pengusul.periode_id, p_kandidat_id, v_inovasi, NOW())
  ON CONFLICT (periode_id, pegawai_id)
  DO UPDATE SET
    deskripsi_inovasi = CASE
      WHEN v_inovasi IS NULL THEN public.nominee_periode.deskripsi_inovasi
      WHEN public.nominee_periode.deskripsi_inovasi IS NULL OR TRIM(public.nominee_periode.deskripsi_inovasi) = '' THEN v_inovasi
      WHEN POSITION(v_inovasi IN public.nominee_periode.deskripsi_inovasi) > 0 THEN public.nominee_periode.deskripsi_inovasi
      ELSE public.nominee_periode.deskripsi_inovasi || E'\n\n---\n\n' || v_inovasi
    END;

  -- 2. Insert skor kuesioner per pertanyaan beserta kata_kunci & deskripsi_inovasi
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_scores_json)
  LOOP
    v_q_id := (v_item->>'pertanyaan_id')::BIGINT;
    v_skor := (v_item->>'skor')::NUMERIC;

    INSERT INTO public.penilaian_pionir_pengusul (
      periode_id,
      pengusul_id,
      kandidat_id,
      pertanyaan_id,
      skor,
      kata_kunci,
      deskripsi_inovasi,
      created_at
    ) VALUES (
      v_pengusul.periode_id,
      v_pengusul.pegawai_id,
      p_kandidat_id,
      v_q_id,
      v_skor,
      TRIM(p_kata_kunci),
      v_inovasi,
      NOW()
    )
    ON CONFLICT (periode_id, pengusul_id, kandidat_id, pertanyaan_id)
    DO UPDATE SET 
      skor = EXCLUDED.skor,
      kata_kunci = EXCLUDED.kata_kunci,
      deskripsi_inovasi = EXCLUDED.deskripsi_inovasi;
  END LOOP;

  -- 3. Tandai token terpakai
  UPDATE public.pengusul_periode
  SET is_digunakan = TRUE,
      submitted_at = NOW()
  WHERE id = v_pengusul.id;

  RETURN jsonb_build_object('success', true, 'message', 'Usulan dan penilaian berhasil dikirim.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_usulan_pionir(UUID, BIGINT, JSONB, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Perbarui get_kandidat_pionir_periode agar turut mengembalikan deskripsi_inovasi
CREATE OR REPLACE FUNCTION public.get_kandidat_pionir_periode(p_periode_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_res JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'nama', p.nama,
      'nip', p.nip,
      'nip_baru', p.nip_baru,
      'jabatan', p.jabatan,
      'foto_url', p.foto_url,
      'unit_kerja', w.nama_wilayah,
      'jumlah_pengusul', COALESCE(sub.jml_pengusul, 0),
      'kata_pengusul', COALESCE(sub.kumpulan_kata, ''),
      'deskripsi_inovasi', COALESCE(NULLIF(TRIM(np.deskripsi_inovasi), ''), sub.kumpulan_inovasi, '')
    )
  ) INTO v_res
  FROM public.nominee_periode np
  JOIN public.pegawai p ON p.id = np.pegawai_id
  LEFT JOIN public.wilayah w ON w.id = p.wilayah_id
  LEFT JOIN (
    SELECT 
      kandidat_id,
      COUNT(DISTINCT pengusul_id) AS jml_pengusul,
      STRING_AGG(DISTINCT TRIM(kata_kunci), ', ') FILTER (WHERE kata_kunci IS NOT NULL AND TRIM(kata_kunci) != '') AS kumpulan_kata,
      STRING_AGG(DISTINCT TRIM(deskripsi_inovasi), E'\n\n---\n\n') FILTER (WHERE deskripsi_inovasi IS NOT NULL AND TRIM(deskripsi_inovasi) != '') AS kumpulan_inovasi
    FROM public.penilaian_pionir_pengusul
    WHERE periode_id = p_periode_id
    GROUP BY kandidat_id
  ) sub ON sub.kandidat_id = p.id
  WHERE np.periode_id = p_periode_id;

  RETURN COALESCE(v_res, '[]'::jsonb);
END;
$$;

-- 5. RPC: Update Deskripsi Inovasi Kandidat oleh Admin / Kepala Kantor
CREATE OR REPLACE FUNCTION public.update_inovasi_kandidat_pionir(
  p_periode_id BIGINT,
  p_nominee_id BIGINT,
  p_deskripsi_inovasi TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID;
  v_pegawai RECORD;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: Sesi login tidak ditemukan.';
  END IF;

  SELECT id, role_admin, is_kakan INTO v_pegawai
  FROM public.pegawai
  WHERE user_id = v_uid
  LIMIT 1;

  IF NOT FOUND OR (
    COALESCE(v_pegawai.role_admin::text, 'USER_BIASA') = 'USER_BIASA'
    AND COALESCE(v_pegawai.is_kakan, FALSE) = FALSE
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Admin atau Kepala Kantor yang diizinkan mengubah deskripsi inovasi.';
  END IF;

  UPDATE public.nominee_periode
  SET deskripsi_inovasi = NULLIF(TRIM(COALESCE(p_deskripsi_inovasi, '')), '')
  WHERE periode_id = p_periode_id AND pegawai_id = p_nominee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_inovasi_kandidat_pionir(BIGINT, BIGINT, TEXT) TO authenticated, service_role;

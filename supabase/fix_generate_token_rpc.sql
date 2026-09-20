CREATE OR REPLACE FUNCTION public.generate_token_penilaian_multi_unit(p_periode_id bigint, p_wilayah_ids bigint[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_is_nominee_can_vote BOOLEAN;
BEGIN
  -- Ambil pengaturan is_nominee_can_vote dari periode
  SELECT is_nominee_can_vote INTO v_is_nominee_can_vote
  FROM public.periode_penilaian
  WHERE id = p_periode_id;

  -- Jika is_nominee_can_vote = true atau null (default)
  IF v_is_nominee_can_vote IS NULL OR v_is_nominee_can_vote = true THEN
    WITH new_tokens AS (
      INSERT INTO public.akses_penilai (periode_id, pegawai_id, token_akses, is_digunakan)
      SELECT 
        p_periode_id,
        p.id,
        gen_random_uuid(),
        false
      FROM public.pegawai p
      WHERE p.wilayah_id = ANY(p_wilayah_ids)
        AND p.is_active = true
        AND p.role_admin != 'SUPER_ADMIN'
        AND NOT EXISTS (
          SELECT 1 
          FROM public.akses_penilai ap 
          WHERE ap.periode_id = p_periode_id 
            AND ap.pegawai_id = p.id
        )
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM new_tokens;
    
  -- Jika is_nominee_can_vote = false (kecualikan nominee)
  ELSE
    WITH new_tokens AS (
      INSERT INTO public.akses_penilai (periode_id, pegawai_id, token_akses, is_digunakan)
      SELECT 
        p_periode_id,
        p.id,
        gen_random_uuid(),
        false
      FROM public.pegawai p
      WHERE p.wilayah_id = ANY(p_wilayah_ids)
        AND p.is_active = true
        AND p.role_admin != 'SUPER_ADMIN'
        AND NOT EXISTS (
          SELECT 1 
          FROM public.akses_penilai ap 
          WHERE ap.periode_id = p_periode_id 
            AND ap.pegawai_id = p.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.nominee_periode np
          WHERE np.periode_id = p_periode_id
            AND np.pegawai_id = p.id
        )
      RETURNING 1
    )
    SELECT count(*) INTO v_count FROM new_tokens;
  END IF;

  RETURN v_count;
END;
$$;

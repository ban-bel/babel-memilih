-- Tambah kolom 'dinilai' untuk membedakan antara pelengkap (false) dan komponen ternilai (true)
ALTER TABLE public.periode_penilaian
ADD COLUMN is_video_profil_dinilai BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN is_portofolio_pengembangan_dinilai BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN is_portofolio_inovasi_dinilai BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN is_portofolio_penghargaan_dinilai BOOLEAN NOT NULL DEFAULT FALSE;

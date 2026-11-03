SET local check_function_bodies = off;

CREATE SEQUENCE "public"."akses_nominee_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."akses_penilai_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."jawaban_nominee_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."juri_periode_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."kategori_penilaian_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."keputusan_kakan_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."kontak_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."kriteria_mode2a_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."log_aktivitas_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."log_notifikasi_wa_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."nominee_periode_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."notifikasi_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."pegawai_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."pemenang_per_kategori_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."penilaian_juri_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."penilaian_mode2a_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."penilaian_skor_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."periode_penilaian_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."periode_unit_kerja_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."pertanyaan_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."suara_kategori_vote_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."suara_quick_vote_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."template_pesan_wa_id_seq" AS integer INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."voting_kategori_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE "public"."wilayah_id_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE "public"."akses_nominee" (
  "id"                       bigint                      NOT NULL DEFAULT nextval('public.akses_nominee_id_seq'::regclass),
  "periode_id"               bigint,
  "nominee_id"               bigint,
  "token_akses"              uuid                        DEFAULT extensions.uuid_generate_v4(),
  "is_digunakan"             boolean                     DEFAULT false,
  "submitted_at"             timestamp with time zone,
  "notifikasi_wa_sent_at"    timestamp without time zone,
  "notifikasi_email_sent_at" timestamp with time zone,
  CONSTRAINT "akses_nominee_periode_id_nominee_id_key" UNIQUE (periode_id, nominee_id),
  CONSTRAINT "akses_nominee_pkey" PRIMARY KEY (id),
  CONSTRAINT "akses_nominee_token_akses_key" UNIQUE (token_akses)
);

ALTER TABLE "public"."akses_nominee"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."akses_penilai" (
  "id"                       bigint                      NOT NULL DEFAULT nextval('public.akses_penilai_id_seq'::regclass),
  "periode_id"               bigint,
  "pegawai_id"               bigint,
  "token_akses"              uuid                        DEFAULT extensions.uuid_generate_v4(),
  "is_digunakan"             boolean                     DEFAULT false,
  "submitted_at"             timestamp with time zone,
  "ip_address"               character varying(45),
  "user_agent"               text,
  "notifikasi_wa_sent_at"    timestamp without time zone,
  "notifikasi_email_sent_at" timestamp with time zone,
  "draft_mode_1a"            jsonb                       DEFAULT '{}'::jsonb,
  "draft_mode_1c"            jsonb                       DEFAULT '{}'::jsonb,
  CONSTRAINT "akses_penilai_periode_id_pegawai_id_key" UNIQUE (periode_id, pegawai_id),
  CONSTRAINT "akses_penilai_pkey" PRIMARY KEY (id),
  CONSTRAINT "akses_penilai_token_akses_key" UNIQUE (token_akses)
);

ALTER TABLE "public"."akses_penilai"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."jawaban_nominee" (
  "id"            bigint                   NOT NULL DEFAULT nextval('public.jawaban_nominee_id_seq'::regclass),
  "periode_id"    bigint,
  "nominee_id"    bigint,
  "pertanyaan_id" bigint,
  "teks_jawaban"  text,
  "file_url"      text,
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "jawaban_nominee_nominee_id_pertanyaan_id_key" UNIQUE (nominee_id, pertanyaan_id),
  CONSTRAINT "jawaban_nominee_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."jawaban_nominee"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."juri_periode" (
  "id"                       bigint                      NOT NULL DEFAULT nextval('public.juri_periode_id_seq'::regclass),
  "periode_id"               bigint,
  "pegawai_id"               bigint,
  "token_akses"              uuid                        DEFAULT extensions.uuid_generate_v4(),
  "is_ketua_juri"            boolean                     DEFAULT false,
  "is_digunakan"             boolean                     DEFAULT false,
  "submitted_at"             timestamp with time zone,
  "notifikasi_wa_sent_at"    timestamp without time zone,
  "notifikasi_email_sent_at" timestamp with time zone,
  "is_can_vote_own_region"   boolean                     NOT NULL DEFAULT true,
  "draft_mode_2"             jsonb                       DEFAULT '{}'::jsonb,
  "draft_mode_2a"            jsonb                       DEFAULT '{}'::jsonb,
  "blocked_nominee_ids"      bigint[]                    DEFAULT '{}'::bigint[],
  CONSTRAINT "juri_periode_periode_id_pegawai_id_key" UNIQUE (periode_id, pegawai_id),
  CONSTRAINT "juri_periode_pkey" PRIMARY KEY (id),
  CONSTRAINT "juri_periode_token_akses_key" UNIQUE (token_akses)
);

ALTER TABLE "public"."juri_periode"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."kategori_penilaian" (
  "id"            bigint       NOT NULL DEFAULT nextval('public.kategori_penilaian_id_seq'::regclass),
  "periode_id"    bigint,
  "nama_kategori" text         NOT NULL,
  "deskripsi"     text,
  "bobot_persen"  numeric(5,2) DEFAULT 0,
  "skor_min"      integer      DEFAULT 1,
  "skor_max"      integer      DEFAULT 100,
  CONSTRAINT "kategori_penilaian_bobot_persen_check" CHECK (((bobot_persen >= (0)::numeric) AND (bobot_persen <= (100)::numeric))),
  CONSTRAINT "kategori_penilaian_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."kategori_penilaian"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."keputusan_kakan" (
  "id"                   bigint                   NOT NULL DEFAULT nextval('public.keputusan_kakan_id_seq'::regclass),
  "created_at"           timestamp with time zone DEFAULT now(),
  "periode_id"           bigint,
  "kakan_id"             bigint,
  "pemenang_id"          bigint,
  "catatan_pertimbangan" text                     NOT NULL,
  CONSTRAINT "keputusan_kakan_periode_id_key" UNIQUE (periode_id),
  CONSTRAINT "keputusan_kakan_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."keputusan_kakan"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."kontak" (
  "id"         bigint                   NOT NULL DEFAULT nextval('public.kontak_id_seq'::regclass),
  "nama"       text                     NOT NULL,
  "nomor_hp"   character varying(20),
  "email"      character varying(100),
  "kategori"   character varying(50)    DEFAULT 'GENERAL'::character varying,
  "metadata"   jsonb                    DEFAULT '{}'::jsonb,
  "is_active"  boolean                  DEFAULT true,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "kontak_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."kontak"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."kriteria_mode2a" (
  "id"            bigint                   NOT NULL DEFAULT nextval('public.kriteria_mode2a_id_seq'::regclass),
  "periode_id"    bigint                   NOT NULL,
  "nama_kriteria" text                     NOT NULL,
  "deskripsi"     text,
  "skor_min"      integer                  DEFAULT 1,
  "skor_max"      integer                  DEFAULT 100,
  "urutan"        integer                  DEFAULT 1,
  "created_at"    timestamp with time zone DEFAULT now(),
  "updated_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "kriteria_mode2a_periode_id_nama_kriteria_key" UNIQUE (periode_id, nama_kriteria),
  CONSTRAINT "kriteria_mode2a_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."kriteria_mode2a"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."log_aktivitas" (
  "id"         bigint                   NOT NULL DEFAULT nextval('public.log_aktivitas_id_seq'::regclass),
  "created_at" timestamp with time zone DEFAULT now(),
  "user_id"    uuid,
  "pegawai_id" bigint,
  "aksi"       character varying(50)    NOT NULL,
  "detail"     text,
  "ip_address" character varying(45),
  CONSTRAINT "log_aktivitas_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."log_aktivitas"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."log_notifikasi_email" (
  "id"            uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "periode_id"    bigint                   NOT NULL,
  "pegawai_id"    bigint                   NOT NULL,
  "kategori"      character varying(50)    NOT NULL,
  "email_tujuan"  character varying(255)   NOT NULL,
  "status"        character varying(50)    NOT NULL,
  "error_message" text,
  "sent_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "log_notifikasi_email_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."log_notifikasi_email"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."log_notifikasi_wa" (
  "id"            integer                     NOT NULL DEFAULT nextval('public.log_notifikasi_wa_id_seq'::regclass),
  "periode_id"    bigint,
  "kategori"      character varying(20)       NOT NULL,
  "pegawai_id"    bigint,
  "token_id"      bigint,
  "template_id"   bigint,
  "nomor_hp"      character varying(20)       NOT NULL,
  "isi_pesan"     text,
  "status"        character varying(20)       NOT NULL,
  "error_message" text,
  "sent_at"       timestamp without time zone,
  "created_at"    timestamp without time zone DEFAULT now(),
  CONSTRAINT "log_notifikasi_wa_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."log_notifikasi_wa"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."nominee_periode" (
  "id"                      bigint                   NOT NULL DEFAULT nextval('public.nominee_periode_id_seq'::regclass),
  "periode_id"              bigint,
  "pegawai_id"              bigint,
  "created_at"              timestamp with time zone DEFAULT now(),
  "file_url"                text,
  "video_profil_link"       text,
  "dokumen_link"            text,
  "tabel_kehadiran"         jsonb                    DEFAULT '[]'::jsonb,
  "portofolio_pengembangan" jsonb                    DEFAULT '[]'::jsonb,
  "portofolio_inovasi"      jsonb                    DEFAULT '[]'::jsonb,
  "portofolio_penghargaan"  jsonb                    DEFAULT '[]'::jsonb,
  CONSTRAINT "nominee_periode_periode_id_pegawai_id_key" UNIQUE (periode_id, pegawai_id),
  CONSTRAINT "nominee_periode_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."nominee_periode"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifikasi" (
  "id"             bigint                   NOT NULL DEFAULT nextval('public.notifikasi_id_seq'::regclass),
  "jenis_penerima" text                     NOT NULL,
  "penerima_id"    bigint                   NOT NULL,
  "channel"        text                     NOT NULL,
  "template_id"    integer,
  "isi_pesan"      text,
  "status"         text                     DEFAULT 'PENDING'::text,
  "error_message"  text,
  "sent_at"        timestamp with time zone,
  "created_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "notifikasi_channel_check" CHECK ((channel = ANY (ARRAY['WHATSAPP'::text, 'EMAIL'::text]))),
  CONSTRAINT "notifikasi_jenis_penerima_check" CHECK ((jenis_penerima = ANY (ARRAY['PEGAWAI'::text, 'KONTAK'::text]))),
  CONSTRAINT "notifikasi_pkey" PRIMARY KEY (id),
  CONSTRAINT "notifikasi_status_check" CHECK ((status = ANY (ARRAY['PENDING'::text, 'SENT'::text, 'FAILED'::text])))
);

ALTER TABLE "public"."notifikasi"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pegawai" (
  "id"          bigint                   NOT NULL DEFAULT nextval('public.pegawai_id_seq'::regclass),
  "created_at"  timestamp with time zone DEFAULT now(),
  "user_id"     uuid,
  "nama"        text                     NOT NULL,
  "nip"         character varying(30),
  "nip_baru"    character varying(30),
  "email"       character varying(100),
  "no_hp"       character varying(20),
  "wilayah_id"  bigint                   NOT NULL,
  "golongan"    character varying(10),
  "jabatan"     text,
  "is_kakan"    boolean                  DEFAULT false,
  "foto_url"    text                     DEFAULT 'https://github.com/identicons/default.png'::text,
  "is_active"   boolean                  DEFAULT true,
  "wa_jid"      text,
  "wa_lid"      text,
  "is_wa_valid" boolean,
  CONSTRAINT "pegawai_nip_baru_key" UNIQUE (nip_baru),
  CONSTRAINT "pegawai_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."pegawai"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pemenang_per_kategori" (
  "id"             bigint                   NOT NULL DEFAULT nextval('public.pemenang_per_kategori_id_seq'::regclass),
  "periode_id"     bigint,
  "kategori_id"    bigint,
  "nominee_id"     bigint,
  "suara_total"    integer                  DEFAULT 0,
  "is_auto_locked" boolean                  DEFAULT false,
  "catatan"        text,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  CONSTRAINT "pemenang_per_kategori_periode_id_kategori_id_key" UNIQUE (periode_id, kategori_id),
  CONSTRAINT "pemenang_per_kategori_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."pemenang_per_kategori"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."penilaian_juri" (
  "id"           bigint                   NOT NULL DEFAULT nextval('public.penilaian_juri_id_seq'::regclass),
  "created_at"   timestamp with time zone DEFAULT now(),
  "periode_id"   bigint,
  "juri_id"      bigint,
  "nominee_id"   bigint,
  "kategori_id"  bigint,
  "skor"         numeric(5,2)             NOT NULL,
  "catatan_juri" text,
  CONSTRAINT "anti_self_vote_mode2" CHECK ((juri_id <> nominee_id)),
  CONSTRAINT "penilaian_juri_periode_id_juri_id_nominee_id_kategori_id_key" UNIQUE (periode_id, juri_id, nominee_id, kategori_id),
  CONSTRAINT "penilaian_juri_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."penilaian_juri"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."penilaian_mode2a" (
  "id"          bigint                   NOT NULL DEFAULT nextval('public.penilaian_mode2a_id_seq'::regclass),
  "periode_id"  bigint                   NOT NULL,
  "penilai_id"  bigint                   NOT NULL,
  "nominee_id"  bigint                   NOT NULL,
  "skor"        integer                  NOT NULL,
  "created_at"  timestamp with time zone DEFAULT now(),
  "updated_at"  timestamp with time zone DEFAULT now(),
  "kriteria_id" bigint,
  CONSTRAINT "anti_self_vote_mode2a" CHECK ((penilai_id <> nominee_id)),
  CONSTRAINT "penilaian_mode2a_periode_penilai_nominee_kriteria_key" UNIQUE (periode_id, penilai_id, nominee_id, kriteria_id),
  CONSTRAINT "penilaian_mode2a_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."penilaian_mode2a"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."penilaian_skor" (
  "id"            bigint                   NOT NULL DEFAULT nextval('public.penilaian_skor_id_seq'::regclass),
  "created_at"    timestamp with time zone DEFAULT now(),
  "periode_id"    bigint,
  "penilai_id"    bigint,
  "nominee_id"    bigint,
  "pertanyaan_id" bigint,
  "skor"          integer                  NOT NULL,
  CONSTRAINT "anti_self_vote_1a" CHECK ((penilai_id <> nominee_id)),
  CONSTRAINT "penilaian_skor_periode_id_penilai_id_nominee_id_pertanyaan__key" UNIQUE (periode_id, penilai_id, nominee_id, pertanyaan_id),
  CONSTRAINT "penilaian_skor_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."penilaian_skor"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."periode_penilaian" (
  "id"                                 bigint                   NOT NULL DEFAULT nextval('public.periode_penilaian_id_seq'::regclass),
  "created_at"                         timestamp with time zone DEFAULT now(),
  "created_by"                         bigint,
  "wilayah_id"                         bigint,
  "nama_periode"                       text                     NOT NULL,
  "petunjuk_penilaian"                 text,
  "jumlah_kandidat_kakan"              integer                  DEFAULT 3,
  "tgl_mulai"                          timestamp with time zone NOT NULL,
  "tgl_selesai"                        timestamp with time zone NOT NULL,
  "is_video_profil"                    boolean                  DEFAULT false,
  "max_nominee"                        integer                  DEFAULT 10,
  "is_nominee_can_vote"                boolean                  DEFAULT true,
  "is_allow_abstain"                   boolean                  DEFAULT false,
  "is_tabel_kehadiran"                 boolean                  NOT NULL DEFAULT false,
  "is_portofolio_pengembangan"         boolean                  DEFAULT false,
  "is_portofolio_inovasi"              boolean                  DEFAULT false,
  "is_portofolio_penghargaan"          boolean                  DEFAULT false,
  "is_video_profil_dinilai"            boolean                  NOT NULL DEFAULT false,
  "is_portofolio_pengembangan_dinilai" boolean                  NOT NULL DEFAULT false,
  "is_portofolio_inovasi_dinilai"      boolean                  NOT NULL DEFAULT false,
  "is_portofolio_penghargaan_dinilai"  boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "check_jadwal_valid" CHECK ((tgl_selesai > tgl_mulai)),
  CONSTRAINT "periode_penilaian_jumlah_kandidat_kakan_check" CHECK ((jumlah_kandidat_kakan > 0)),
  CONSTRAINT "periode_penilaian_max_nominee_check" CHECK ((max_nominee > 0)),
  CONSTRAINT "periode_penilaian_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."periode_penilaian"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."periode_unit_kerja" (
  "id"         bigint                   NOT NULL DEFAULT nextval('public.periode_unit_kerja_id_seq'::regclass),
  "periode_id" bigint                   NOT NULL,
  "wilayah_id" bigint                   NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "periode_unit_kerja_periode_id_wilayah_id_key" UNIQUE (periode_id, wilayah_id),
  CONSTRAINT "periode_unit_kerja_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."periode_unit_kerja"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pertanyaan" (
  "id"              bigint  NOT NULL DEFAULT nextval('public.pertanyaan_id_seq'::regclass),
  "periode_id"      bigint,
  "urutan"          integer DEFAULT 1,
  "teks_pertanyaan" text    NOT NULL,
  "skor_min"        integer DEFAULT 1,
  "skor_max"        integer DEFAULT 100,
  CONSTRAINT "pertanyaan_check" CHECK ((skor_max > skor_min)),
  CONSTRAINT "pertanyaan_pkey" PRIMARY KEY (id),
  CONSTRAINT "pertanyaan_skor_min_check" CHECK ((skor_min >= 0))
);

ALTER TABLE "public"."pertanyaan"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."suara_kategori_vote" (
  "id"          bigint                   NOT NULL DEFAULT nextval('public.suara_kategori_vote_id_seq'::regclass),
  "created_at"  timestamp with time zone DEFAULT now(),
  "periode_id"  bigint,
  "voter_id"    bigint,
  "kategori_id" bigint,
  "nominee_id"  bigint,
  CONSTRAINT "anti_self_vote_mode1c" CHECK ((voter_id <> nominee_id)),
  CONSTRAINT "suara_kategori_vote_periode_id_voter_id_kategori_id_key" UNIQUE (periode_id, voter_id, kategori_id),
  CONSTRAINT "suara_kategori_vote_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."suara_kategori_vote"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."suara_quick_vote" (
  "id"                 bigint                   NOT NULL DEFAULT nextval('public.suara_quick_vote_id_seq'::regclass),
  "created_at"         timestamp with time zone DEFAULT now(),
  "periode_id"         bigint,
  "penilai_id"         bigint,
  "nominee_pilihan_id" bigint,
  CONSTRAINT "anti_self_vote_1b" CHECK ((penilai_id <> nominee_pilihan_id)),
  CONSTRAINT "suara_quick_vote_periode_id_penilai_id_key" UNIQUE (periode_id, penilai_id),
  CONSTRAINT "suara_quick_vote_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."suara_quick_vote"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."template_pesan_wa" (
  "id"            integer                     NOT NULL DEFAULT nextval('public.template_pesan_wa_id_seq'::regclass),
  "nama_tampilan" character varying(100)      NOT NULL,
  "isi_pesan"     text                        NOT NULL,
  "is_active"     boolean                     DEFAULT true,
  "created_by"    bigint,
  "created_at"    timestamp without time zone DEFAULT now(),
  "updated_at"    timestamp without time zone DEFAULT now(),
  "jenis_channel" text                        DEFAULT 'WHATSAPP'::text,
  CONSTRAINT "template_pesan_wa_jenis_channel_check" CHECK ((jenis_channel = ANY (ARRAY['WHATSAPP'::text, 'EMAIL'::text]))),
  CONSTRAINT "template_pesan_wa_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."template_pesan_wa"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."voting_kategori" (
  "id"            bigint                   NOT NULL DEFAULT nextval('public.voting_kategori_id_seq'::regclass),
  "periode_id"    bigint,
  "nama_kategori" text                     NOT NULL,
  "deskripsi"     text,
  "urutan"        integer                  DEFAULT 1,
  "created_at"    timestamp with time zone DEFAULT now(),
  CONSTRAINT "voting_kategori_periode_id_nama_kategori_key" UNIQUE (periode_id, nama_kategori),
  CONSTRAINT "voting_kategori_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."voting_kategori"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."wilayah" (
  "id"              bigint                   NOT NULL DEFAULT nextval('public.wilayah_id_seq'::regclass),
  "nama_wilayah"    text                     NOT NULL,
  "level"           character varying(20)    NOT NULL,
  "parent_id"       bigint,
  "created_at"      timestamp with time zone DEFAULT now(),
  "kode_wilayah"    character varying(4),
  "nama_unit_kerja" text,
  CONSTRAINT "wilayah_level_check" CHECK (((level)::text = ANY ((ARRAY['PROVINSI'::character varying, 'KABKOTA'::character varying])::text[]))),
  CONSTRAINT "wilayah_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."wilayah"
  ENABLE ROW LEVEL SECURITY;

ALTER SEQUENCE "public"."akses_nominee_id_seq" OWNED BY "public"."akses_nominee"."id";

ALTER SEQUENCE "public"."akses_penilai_id_seq" OWNED BY "public"."akses_penilai"."id";

ALTER SEQUENCE "public"."jawaban_nominee_id_seq" OWNED BY "public"."jawaban_nominee"."id";

ALTER SEQUENCE "public"."juri_periode_id_seq" OWNED BY "public"."juri_periode"."id";

ALTER SEQUENCE "public"."kategori_penilaian_id_seq" OWNED BY "public"."kategori_penilaian"."id";

ALTER SEQUENCE "public"."keputusan_kakan_id_seq" OWNED BY "public"."keputusan_kakan"."id";

ALTER SEQUENCE "public"."kontak_id_seq" OWNED BY "public"."kontak"."id";

ALTER SEQUENCE "public"."kriteria_mode2a_id_seq" OWNED BY "public"."kriteria_mode2a"."id";

ALTER SEQUENCE "public"."log_aktivitas_id_seq" OWNED BY "public"."log_aktivitas"."id";

ALTER SEQUENCE "public"."log_notifikasi_wa_id_seq" OWNED BY "public"."log_notifikasi_wa"."id";

ALTER SEQUENCE "public"."nominee_periode_id_seq" OWNED BY "public"."nominee_periode"."id";

ALTER SEQUENCE "public"."notifikasi_id_seq" OWNED BY "public"."notifikasi"."id";

ALTER SEQUENCE "public"."pegawai_id_seq" OWNED BY "public"."pegawai"."id";

ALTER SEQUENCE "public"."pemenang_per_kategori_id_seq" OWNED BY "public"."pemenang_per_kategori"."id";

ALTER SEQUENCE "public"."penilaian_juri_id_seq" OWNED BY "public"."penilaian_juri"."id";

ALTER SEQUENCE "public"."penilaian_mode2a_id_seq" OWNED BY "public"."penilaian_mode2a"."id";

ALTER SEQUENCE "public"."penilaian_skor_id_seq" OWNED BY "public"."penilaian_skor"."id";

ALTER SEQUENCE "public"."periode_penilaian_id_seq" OWNED BY "public"."periode_penilaian"."id";

ALTER SEQUENCE "public"."periode_unit_kerja_id_seq" OWNED BY "public"."periode_unit_kerja"."id";

ALTER SEQUENCE "public"."pertanyaan_id_seq" OWNED BY "public"."pertanyaan"."id";

ALTER SEQUENCE "public"."suara_kategori_vote_id_seq" OWNED BY "public"."suara_kategori_vote"."id";

ALTER SEQUENCE "public"."suara_quick_vote_id_seq" OWNED BY "public"."suara_quick_vote"."id";

ALTER SEQUENCE "public"."template_pesan_wa_id_seq" OWNED BY "public"."template_pesan_wa"."id";

ALTER SEQUENCE "public"."voting_kategori_id_seq" OWNED BY "public"."voting_kategori"."id";

ALTER SEQUENCE "public"."wilayah_id_seq" OWNED BY "public"."wilayah"."id";

CREATE TYPE "public"."mode_penilaian_enum" AS ENUM (
  'MODE_1A',
  'MODE_1B',
  'MODE_2',
  'MODE_2A'
);

ALTER TABLE "public"."periode_penilaian"
  ADD COLUMN "mode_penilaian" public.mode_penilaian_enum DEFAULT 'MODE_1A'::public.mode_penilaian_enum;

CREATE TYPE "public"."status_periode_enum" AS ENUM (
  'DRAFT',
  'BERJALAN',
  'SELESAI',
  'DIARSIPKAN'
);

ALTER TABLE "public"."periode_penilaian"
  ADD COLUMN "status" public.status_periode_enum DEFAULT 'DRAFT'::public.status_periode_enum;

CREATE TYPE "public"."user_role_enum" AS ENUM (
  'SUPER_ADMIN',
  'ADMIN_PROVINSI',
  'ADMIN_KABKOTA',
  'USER_BIASA'
);

ALTER TABLE "public"."pegawai"
  ADD COLUMN "role_admin" public.user_role_enum DEFAULT 'USER_BIASA'::public.user_role_enum;

CREATE OR REPLACE FUNCTION public.auto_generate_pemenang_per_kategori (
  p_periode_id bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  DECLARE
      v_kategori RECORD;
      v_pemenang RECORD;
  BEGIN
      FOR v_kategori IN
          SELECT id, nama_kategori FROM voting_kategori WHERE periode_id = p_periode_id
      LOOP
          SELECT
              np.pegawai_id,
              COUNT(skv.id)::INT as suara_total
          INTO v_pemenang
          FROM nominee_periode np
          LEFT JOIN suara_kategori_vote skv ON np.id = skv.nominee_id AND skv.kategori_id = v_kategori.id
          WHERE np.periode_id = p_periode_id
          GROUP BY np.pegawai_id
          ORDER BY suara_total DESC
          LIMIT 1;

          -- Skip jika yang existing adalah override manual
          IF NOT EXISTS (
              SELECT 1 FROM pemenang_per_kategori ppc
              WHERE ppc.periode_id = p_periode_id
              AND ppc.kategori_id = v_kategori.id
              AND ppc.is_auto_locked = false
          ) THEN
              INSERT INTO pemenang_per_kategori (periode_id, kategori_id, nominee_id, suara_total,
  is_auto_locked, updated_at)
              VALUES (p_periode_id, v_kategori.id, v_pemenang.pegawai_id, v_pemenang.suara_total, true,
  NOW())
              ON CONFLICT (periode_id, kategori_id) DO UPDATE SET
                  nominee_id = v_pemenang.pegawai_id,
                  suara_total = v_pemenang.suara_total,
                  is_auto_locked = true,
                  updated_at = NOW();
          END IF;
      END LOOP;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.check_total_bobot_kategori (
  p_periode_id bigint
)
  RETURNS boolean
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_total NUMERIC(5,2);
BEGIN
  SELECT SUM(bobot_persen) INTO v_total FROM kategori_penilaian WHERE periode_id = p_periode_id;
  IF v_total <> 100.00 THEN
    RAISE EXCEPTION 'Total bobot kategori harus tepat 100.00%%! Saat ini: %', COALESCE(v_total, 0);
  END IF;
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_token_penilaian_masal (
  p_periode_id bigint,
  p_wilayah_id bigint
)
  RETURNS integer
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- Panggil function baru dengan array 1 elemen
  RETURN generate_token_penilaian_multi_unit(p_periode_id, ARRAY[p_wilayah_id]);
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_token_penilaian_multi_unit (
  p_periode_id  bigint,
  p_wilayah_ids bigint[]
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_akses_juri_by_token (
  p_token uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', jp.id,
    'token_akses', jp.token_akses,
    'is_digunakan', jp.is_digunakan,
    'is_ketua_juri', jp.is_ketua_juri,
    'submitted_at', jp.submitted_at,
    'is_can_vote_own_region', jp.is_can_vote_own_region,
    'blocked_nominee_ids', jp.blocked_nominee_ids,
    'periode', jsonb_build_object(
      'id', pp.id, 'nama_periode', pp.nama_periode, 'petunjuk_penilaian', pp.petunjuk_penilaian,
      'mode_penilaian', pp.mode_penilaian, 'tgl_mulai', pp.tgl_mulai, 'tgl_selesai', pp.tgl_selesai,
      'status', pp.status, 'wilayah_id', pp.wilayah_id
    ),
    'juri', jsonb_build_object(
      'id', peg.id, 'nama', peg.nama, 'nip', peg.nip, 'nip_baru', peg.nip_baru,
      'unit_kerja', COALESCE(w.nama_unit_kerja, w.nama_wilayah, '-'), 'jabatan', peg.jabatan, 'golongan', peg.golongan, 'foto_url', peg.foto_url,
      'wilayah_id', peg.wilayah_id
    )
  ) INTO v_result
  FROM juri_periode jp
  JOIN periode_penilaian pp ON pp.id = jp.periode_id
  JOIN pegawai peg ON peg.id = jp.pegawai_id
  LEFT JOIN wilayah w ON peg.wilayah_id = w.id
  WHERE jp.token_akses = p_token;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_akses_nominee_by_token (
  p_token uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', an.id,
    'token_akses', an.token_akses,
    'is_digunakan', an.is_digunakan,
    'submitted_at', an.submitted_at,
    'periode', jsonb_build_object(
      'id', pp.id, 'nama_periode', pp.nama_periode, 'petunjuk_penilaian', pp.petunjuk_penilaian,
      'mode_penilaian', pp.mode_penilaian, 'tgl_mulai', pp.tgl_mulai, 'tgl_selesai', pp.tgl_selesai, 'status', pp.status,
      'is_video_profil', pp.is_video_profil
    ),
    'nominee', jsonb_build_object(
      'id', peg.id, 'nama', peg.nama, 'nip', peg.nip, 'nip_baru', peg.nip_baru,
      'unit_kerja', COALESCE(w.nama_unit_kerja, w.nama_wilayah, '-'), 'jabatan', peg.jabatan, 'golongan', peg.golongan, 'foto_url', peg.foto_url
    )
  ) INTO v_result
  FROM akses_nominee an
  JOIN periode_penilaian pp ON pp.id = an.periode_id
  JOIN pegawai peg ON peg.id = an.nominee_id
  LEFT JOIN wilayah w ON peg.wilayah_id = w.id
  WHERE an.token_akses = p_token;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_akses_penilai_by_token (
  p_token uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', ap.id,
    'token_akses', ap.token_akses,
    'is_digunakan', ap.is_digunakan,
    'submitted_at', ap.submitted_at,
    'periode', jsonb_build_object(
      'id', pp.id, 'nama_periode', pp.nama_periode, 'petunjuk_penilaian', pp.petunjuk_penilaian,
      'mode_penilaian', pp.mode_penilaian, 'jumlah_kandidat_kakan', pp.jumlah_kandidat_kakan,
      'tgl_mulai', pp.tgl_mulai, 'tgl_selesai', pp.tgl_selesai, 'status', pp.status, 'wilayah_id', pp.wilayah_id,
      'is_allow_abstain', pp.is_allow_abstain
    ),
    'penilai', jsonb_build_object(
      'id', peg.id, 'nama', peg.nama, 'nip', peg.nip, 'nip_baru', peg.nip_baru,
      'unit_kerja', COALESCE(w.nama_unit_kerja, w.nama_wilayah, '-'), 'jabatan', peg.jabatan, 'golongan', 
peg.golongan, 'foto_url', peg.foto_url
    )
  ) INTO v_result
  FROM akses_penilai ap
  JOIN periode_penilaian pp ON pp.id = ap.periode_id
  JOIN pegawai peg ON peg.id = ap.pegawai_id
  LEFT JOIN wilayah w ON peg.wilayah_id = w.id
  WHERE ap.token_akses = p_token;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_draft_penilai (
  p_token uuid,
  p_mode  text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_draft JSONB;
BEGIN
  IF p_mode = '1A' THEN
    SELECT draft_mode_1a INTO v_draft FROM akses_penilai WHERE token_akses = p_token;
  ELSIF p_mode = '1C' THEN
    SELECT draft_mode_1c INTO v_draft FROM akses_penilai WHERE token_akses = p_token;
  ELSIF p_mode = '2' THEN
    SELECT draft_mode_2 INTO v_draft FROM juri_periode WHERE token_akses = p_token;
  ELSIF p_mode = '2A' THEN
    SELECT draft_mode_2a INTO v_draft FROM juri_periode WHERE token_akses = p_token;
  END IF;
  
  RETURN v_draft;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_jumlah_juri_periode (
  p_periode_id bigint
)
  RETURNS integer
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT COUNT(*)::INT FROM juri_periode WHERE periode_id = p_periode_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_kelengkapan_penilai (
  p_periode_id bigint,
  p_mode       text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_total INT := 0;
  v_submitted INT := 0;
  v_min_required INT := 0;
  v_is_complete BOOLEAN := false;
BEGIN
  IF p_mode = 'MODE_2' THEN
    SELECT COUNT(*), COUNT(submitted_at) INTO v_total, v_submitted
    FROM public.juri_periode
    WHERE periode_id = p_periode_id;
  ELSE
    SELECT COUNT(*), COUNT(submitted_at) INTO v_total, v_submitted
    FROM public.akses_penilai
    WHERE periode_id = p_periode_id;
  END IF;

  IF v_total > 0 THEN
    v_min_required := FLOOR(v_total / 2) + 1;
    v_is_complete := (v_submitted >= v_min_required);
  END IF;

  RETURN jsonb_build_object(
    'total', v_total,
    'submitted', v_submitted,
    'minRequired', v_min_required,
    'isComplete', v_is_complete
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_penilaian_mode2a_by_token (
  p_token uuid
)
  RETURNS TABLE (
    periode_id   bigint,
    nominee_id   bigint,
    skor         integer,
    nama_nominee text,
    nip_nominee  text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
    RETURN QUERY
    SELECT
        pm.periode_id,
        pm.nominee_id,
        pm.skor,
        pg.nama AS nama_nominee,
        pg.nip AS nip_nominee
    FROM penilaian_mode2a pm
    JOIN pegawai pg ON pm.nominee_id = pg.id
    JOIN akses_penilai ap ON ap.pegawai_id = pm.penilai_id AND ap.periode_id = pm.periode_id
    WHERE ap.token_akses = p_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_uid_by_email (
  p_email text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Cari ID user dari skema auth yang cocok dengan email (case-insensitive)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
  LIMIT 1;
  
  -- Kembalikan UID (atau NULL jika tidak ketemu)
  RETURN v_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_votes_by_voter_token (
  p_token uuid
)
  RETURNS TABLE (
    kategori_id bigint,
    nominee_id  bigint,
    sudah_vote  boolean
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  DECLARE v_voter_id BIGINT; v_periode_id BIGINT;
  BEGIN
      SELECT ap.pegawai_id, ap.periode_id INTO v_voter_id, v_periode_id
      FROM akses_penilai ap WHERE ap.token_akses = p_token LIMIT 1;
      IF v_voter_id IS NULL THEN RETURN; END IF;
      RETURN QUERY SELECT vk.id, COALESCE(skv.nominee_id, 0)::BIGINT, (skv.id IS NOT NULL)
      FROM voting_kategori vk LEFT JOIN suara_kategori_vote skv ON vk.id = skv.kategori_id AND skv.voter_id = v_voter_id
      WHERE vk.periode_id = v_periode_id ORDER BY vk.urutan ASC;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.get_voting_kategori_by_periode (
  p_periode_id bigint
)
  RETURNS TABLE (
    id            bigint,
    nama_kategori text,
    deskripsi     text,
    urutan        integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  BEGIN
      RETURN QUERY SELECT vk.id, vk.nama_kategori, vk.deskripsi, vk.urutan
      FROM voting_kategori vk WHERE vk.periode_id = p_periode_id ORDER BY vk.urutan ASC;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.is_admin_aktif()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT EXISTS (
    SELECT 1 FROM pegawai WHERE user_id = auth.uid() AND role_admin <> 'USER_BIASA'
  );
$function$;

CREATE OR REPLACE FUNCTION public.reset_akses_penilai_universal (
  p_periode_id bigint,
  p_pegawai_id bigint,
  p_admin_id   bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_mode VARCHAR;
  v_is_admin BOOLEAN;
BEGIN
  -- Validasi apakah pemanggil (auth.uid()) benar-benar admin aktif
  SELECT EXISTS (
    SELECT 1 FROM pegawai WHERE user_id = auth.uid() AND role_admin <> 'USER_BIASA'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Admin yang dapat mereset token.';
  END IF;

  -- Cek mode penilaian
  SELECT mode_penilaian INTO v_mode FROM periode_penilaian WHERE id = p_periode_id;
  IF v_mode IS NULL THEN
    RAISE EXCEPTION 'Periode penilaian tidak ditemukan.';
  END IF;

  -- Reset berdasarkan mode
  IF v_mode = 'MODE_1A' THEN
    DELETE FROM penilaian_skor WHERE periode_id = p_periode_id AND penilai_id = p_pegawai_id;
    UPDATE akses_penilai SET is_digunakan = false, submitted_at = NULL 
    WHERE periode_id = p_periode_id AND pegawai_id = p_pegawai_id;
    
  ELSIF v_mode = 'MODE_1B' THEN
    DELETE FROM suara_quick_vote WHERE periode_id = p_periode_id AND penilai_id = p_pegawai_id;
    UPDATE akses_penilai SET is_digunakan = false, submitted_at = NULL 
    WHERE periode_id = p_periode_id AND pegawai_id = p_pegawai_id;
    
  ELSIF v_mode = 'MODE_2' THEN
    DELETE FROM penilaian_juri WHERE periode_id = p_periode_id AND juri_id = p_pegawai_id;
    UPDATE juri_periode SET is_digunakan = false, submitted_at = NULL 
    WHERE periode_id = p_periode_id AND pegawai_id = p_pegawai_id;
    
  ELSE
    RAISE EXCEPTION 'Mode penilaian tidak valid untuk operasi reset token.';
  END IF;
  
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_penilaian_mode2a (
  p_periode_id bigint,
  p_pegawai_id bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
    DELETE FROM penilaian_mode2a
    WHERE periode_id = p_periode_id AND penilai_id = p_pegawai_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_seluruh_data_periode (
  p_periode_id bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  -- Hapus semua skor dan jawaban
  DELETE FROM penilaian_juri WHERE periode_id = p_periode_id;
  DELETE FROM penilaian_mode2a WHERE periode_id = p_periode_id;
  DELETE FROM penilaian_skor WHERE periode_id = p_periode_id;
  DELETE FROM suara_quick_vote WHERE periode_id = p_periode_id;
  DELETE FROM suara_kategori_vote WHERE periode_id = p_periode_id;
  DELETE FROM jawaban_nominee WHERE periode_id = p_periode_id;

  -- Buka kembali semua token partisipan
  UPDATE akses_penilai SET is_digunakan = false, submitted_at = null, notifikasi_wa_sent_at = null WHERE periode_id = p_periode_id;
  UPDATE akses_nominee SET is_digunakan = false, submitted_at = null, notifikasi_wa_sent_at = null WHERE periode_id = p_periode_id;
  UPDATE juri_periode SET is_digunakan = false, submitted_at = null, notifikasi_wa_sent_at = null WHERE periode_id = p_periode_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_draft_penilai (
  p_token      uuid,
  p_mode       text,
  p_draft_data jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  IF p_mode = '1A' THEN
    UPDATE akses_penilai SET draft_mode_1a = p_draft_data WHERE token_akses = p_token;
  ELSIF p_mode = '1C' THEN
    UPDATE akses_penilai SET draft_mode_1c = p_draft_data WHERE token_akses = p_token;
  ELSIF p_mode = '2' THEN
    UPDATE juri_periode SET draft_mode_2 = p_draft_data WHERE token_akses = p_token;
  ELSIF p_mode = '2A' THEN
    UPDATE juri_periode SET draft_mode_2a = p_draft_data WHERE token_akses = p_token;
  ELSE
    RAISE EXCEPTION 'Mode tidak valid';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_bukti_nominee_mode2 (
  p_token    uuid,
  p_file_url text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_periode_id BIGINT;
  v_pegawai_id BIGINT;
BEGIN
  -- 1. Verifikasi token dan dapatkan identitas nominee
  -- Perbaikan: mengambil nominee_id (bukan pegawai_id) dari akses_nominee
  SELECT periode_id, nominee_id INTO v_periode_id, v_pegawai_id
  FROM akses_nominee
  WHERE token_akses = p_token AND is_digunakan = FALSE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token akses tidak valid atau sudah kadaluarsa.';
  END IF;

  -- 2. Update field file_url di tabel nominee_periode
  UPDATE nominee_periode
  SET file_url = p_file_url
  WHERE periode_id = v_periode_id AND pegawai_id = v_pegawai_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gagal menyimpan bukti. Data nominee tidak ditemukan di periode ini.';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_jawaban_nominee (
  p_token         uuid,
  p_pertanyaan_id bigint,
  p_teks_jawaban  text,
  p_file_url      text   DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_nominee_id BIGINT;
  v_periode_id BIGINT;
  v_existing_id BIGINT;
BEGIN
  -- 1. Validasi Token
  -- Cari nominee_id dan periode_id berdasarkan token akses
  SELECT nominee_id, periode_id 
  INTO v_nominee_id, v_periode_id
  FROM akses_nominee 
  WHERE token_akses = p_token
  LIMIT 1;

  -- Jika token tidak valid / tidak ditemukan, lemparkan error
  IF v_nominee_id IS NULL THEN
    RAISE EXCEPTION 'Token tidak valid atau tidak ditemukan.';
  END IF;

  -- 2. Cek apakah jawaban sudah ada
  SELECT id INTO v_existing_id
  FROM jawaban_nominee
  WHERE nominee_id = v_nominee_id 
    AND periode_id = v_periode_id
    AND pertanyaan_id = p_pertanyaan_id
  LIMIT 1;

  -- 3. Lakukan Insert atau Update (Upsert)
  IF v_existing_id IS NOT NULL THEN
    UPDATE jawaban_nominee
    SET 
      teks_jawaban = p_teks_jawaban,
      file_url = COALESCE(p_file_url, file_url), -- biarkan file lama jika null
      updated_at = NOW()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO jawaban_nominee (periode_id, nominee_id, pertanyaan_id, teks_jawaban, file_url)
    VALUES (v_periode_id, v_nominee_id, p_pertanyaan_id, p_teks_jawaban, p_file_url);
  END IF;
  
  -- Selesai!
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_penilaian_mode2a (
  p_token   uuid,
  p_payload jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_penilai_id BIGINT;
    v_periode_id BIGINT;
    v_json JSONB;
    v_nominee_id BIGINT;
    v_kriteria_id BIGINT;
    v_skor INT;
    v_min_score INT;
    v_max_score INT;
    v_count INT;
BEGIN
    -- Get penilai info from token
    SELECT ap.pegawai_id, ap.periode_id
    INTO v_penilai_id, v_periode_id
    FROM akses_penilai ap
    WHERE ap.token_akses = p_token AND ap.is_digunakan = FALSE;

    IF v_penilai_id IS NULL THEN
        RAISE EXCEPTION 'Token tidak valid';
    END IF;

    IF jsonb_array_length(p_payload) = 0 THEN
        RAISE EXCEPTION 'Payload kosong';
    END IF;

    -- Loop through JSON array
    FOR v_json IN SELECT * FROM jsonb_array_elements(p_payload)
    LOOP
        v_nominee_id := (v_json->>'nominee_id')::BIGINT;
        v_kriteria_id := (v_json->>'kriteria_id')::BIGINT;
        v_skor := (v_json->>'skor')::INT;

        -- Get kriteria skor range
        SELECT skor_min, skor_max INTO v_min_score, v_max_score
        FROM kriteria_mode2a
        WHERE id = v_kriteria_id AND periode_id = v_periode_id;

        IF v_min_score IS NULL THEN
            RAISE EXCEPTION 'Kriteria tidak ditemukan. ID: %', v_kriteria_id;
        END IF;

        -- Validate skor range
        IF v_skor < v_min_score OR v_skor > v_max_score THEN
            RAISE EXCEPTION 'Skor harus antara % dan %', v_min_score, v_max_score;
        END IF;

        -- Insert or update
        INSERT INTO penilaian_mode2a (periode_id, penilai_id, nominee_id, kriteria_id, skor)
        VALUES (v_periode_id, v_penilai_id, v_nominee_id, v_kriteria_id, v_skor)
        ON CONFLICT (periode_id, penilai_id, nominee_id, kriteria_id)
        DO UPDATE SET skor = EXCLUDED.skor, updated_at = NOW();
    END LOOP;

    -- Mark token as used if all criteria scored
    SELECT COUNT(*) INTO v_count FROM kriteria_mode2a WHERE periode_id = v_periode_id;
    IF (SELECT COUNT(DISTINCT kriteria_id) FROM penilaian_mode2a WHERE periode_id = v_periode_id AND penilai_id = v_penilai_id) = v_count THEN
        UPDATE akses_penilai SET is_digunakan = TRUE, submitted_at = NOW() WHERE token_akses = p_token;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_penilaian_mode_1a (
  p_token        uuid,
  p_payload_json jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_akses akses_penilai%ROWTYPE;
  v_item JSONB;
  v_jumlah_nominee INT;
  v_jumlah_nominee_dinilai INT;
  v_daftar_nominee_dinilai TEXT;
BEGIN
  SELECT * INTO v_akses FROM akses_penilai WHERE token_akses = p_token;

  IF v_akses.id IS NULL THEN
    RAISE EXCEPTION 'Token penilai tidak valid.';
  END IF;

  IF v_akses.is_digunakan THEN
    RAISE EXCEPTION 'Token sudah pernah digunakan.';
  END IF;

  -- ============================================================
  -- VALIDASI WAJIB: Hitung jumlah nominee pada periode ini
  -- Exclude penilai sendiri (anti self-vote)
  -- ============================================================
  SELECT COUNT(*) INTO v_jumlah_nominee
  FROM nominee_periode np
  WHERE np.periode_id = v_akses.periode_id
    AND np.pegawai_id <> v_akses.pegawai_id;

  -- ============================================================
  -- VALIDASI WAJIB: Hitung nominee yang sudah dinilai
  -- Dari payload yang dikirim
  -- ============================================================
  SELECT COUNT(DISTINCT (value->>'nominee_id')::BIGINT)
  INTO v_jumlah_nominee_dinilai
  FROM jsonb_array_elements(p_payload_json);

  -- ============================================================
  -- VALIDASI WAJIB: Pastikan semua nominee dinilai
  -- ============================================================
  IF v_jumlah_nominee_dinilai < v_jumlah_nominee THEN
    -- Dapatkan daftar nominee yang BELUM dinilai
    SELECT string_agg(DISTINCT p.nama, ', ')
    INTO v_daftar_nominee_dinilai
    FROM nominee_periode np
    JOIN pegawai p ON np.pegawai_id = p.id
    WHERE np.periode_id = v_akses.periode_id
      AND np.pegawai_id <> v_akses.pegawai_id
      AND np.pegawai_id NOT IN (
        SELECT DISTINCT (value->>'nominee_id')::BIGINT
        FROM jsonb_array_elements(p_payload_json)
      );

    RAISE EXCEPTION 'Wajib menilai SEMUA nominee! Anda baru menilai % dari % nominee. Yang belum dinilai: %',
      v_jumlah_nominee_dinilai, v_jumlah_nominee, COALESCE(v_daftar_nominee_dinilai, 'semua');
  END IF;

  -- ============================================================
  -- VALIDASI WAJIB: Pastikan semua pertanyaan terisi untuk setiap nominee
  -- ============================================================
  DECLARE
    v_nominee_id BIGINT;
    v_pertanyaan_count INT;
    v_skor_count INT;
  BEGIN
    FOR v_nominee_id IN
      SELECT DISTINCT (value->>'nominee_id')::BIGINT
      FROM jsonb_array_elements(p_payload_json)
    LOOP
      -- Hitung pertanyaan untuk periode ini
      SELECT COUNT(*) INTO v_pertanyaan_count
      FROM pertanyaan
      WHERE periode_id = v_akses.periode_id;

      -- Hitung skor yang dikirim untuk nominee ini
      SELECT COUNT(DISTINCT (value->>'pertanyaan_id')::BIGINT) INTO v_skor_count
      FROM jsonb_array_elements(p_payload_json)
      WHERE (value->>'nominee_id')::BIGINT = v_nominee_id;

      IF v_skor_count < v_pertanyaan_count THEN
        RAISE EXCEPTION 'Wajib mengisi SEMUA skor! Nominee ID % belum dinilai lengkap (% skor dari % pertanyaan).',
          v_nominee_id, v_skor_count, v_pertanyaan_count;
      END IF;
    END LOOP;
  END;

  -- ============================================================
  -- Looping payload dan insert satu-satu
  -- ============================================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload_json)
  LOOP
    IF (v_item->>'nominee_id')::BIGINT = v_akses.pegawai_id THEN
       RAISE EXCEPTION 'Tidak diperbolehkan menilai diri sendiri (Self-Vote terdeteksi).';
    END IF;

    INSERT INTO penilaian_skor (periode_id, penilai_id, nominee_id, pertanyaan_id, skor)
    VALUES (
      v_akses.periode_id,
      v_akses.pegawai_id,
      (v_item->>'nominee_id')::BIGINT,
      (v_item->>'pertanyaan_id')::BIGINT,
      (v_item->>'skor')::NUMERIC
    );
  END LOOP;

  -- Tandai token terpakai
  UPDATE akses_penilai SET is_digunakan = true, submitted_at = now() WHERE id = v_akses.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_penilaian_mode_2 (
  p_token        uuid,
  p_payload_json jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_juri_id bigint;
  v_periode_id bigint;
  v_item jsonb;
  v_nominee_id bigint;
  v_kategori_id bigint;
  v_skor numeric;
  v_catatan text;
BEGIN
  -- 1. Validasi Token Juri
  SELECT pegawai_id, periode_id
  INTO v_juri_id, v_periode_id
  FROM juri_periode
  WHERE token_akses = p_token
  LIMIT 1;

  IF v_juri_id IS NULL THEN
    RAISE EXCEPTION 'Token juri tidak valid atau tidak ditemukan.';
  END IF;

  -- 2. Loop payload dan simpan penilaian
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload_json)
  LOOP
    -- CAST value from jsonb properly (->> extracts text, then ::bigint casts it safely)
    v_nominee_id := (v_item->>'nominee_id')::bigint;
    v_kategori_id := (v_item->>'kategori_id')::bigint;
    v_skor := (v_item->>'skor')::numeric;
    v_catatan := v_item->>'catatan_juri';

    -- Validasi data kosong
    IF v_nominee_id IS NULL OR v_kategori_id IS NULL OR v_skor IS NULL THEN
       RAISE EXCEPTION 'Payload tidak lengkap. Nominee, Kategori, dan Skor wajib diisi.';
    END IF;

    -- Upsert penilaian
    -- Coba update dulu
    UPDATE penilaian_juri
    SET skor = v_skor,
        catatan_juri = v_catatan
    WHERE juri_id = v_juri_id
      AND periode_id = v_periode_id
      AND nominee_id = v_nominee_id
      AND kategori_id = v_kategori_id;

    -- Jika update tidak ada (belum ada barisnya), maka insert
    IF NOT FOUND THEN
      INSERT INTO penilaian_juri (
        periode_id,
        juri_id,
        nominee_id,
        kategori_id,
        skor,
        catatan_juri
      ) VALUES (
        v_periode_id,
        v_juri_id,
        v_nominee_id,
        v_kategori_id,
        v_skor,
        v_catatan
      );
    END IF;
  END LOOP;

  -- 3. Tandai token juri telah digunakan
  UPDATE juri_periode
  SET is_digunakan = true,
      submitted_at = NOW()
  WHERE token_akses = p_token;

END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_quick_vote_mode_1b (
  p_token      uuid,
  p_nominee_id bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_akses akses_penilai%ROWTYPE;
BEGIN
  SELECT * INTO v_akses FROM akses_penilai WHERE token_akses = p_token;

  IF v_akses.id IS NULL THEN
    RAISE EXCEPTION 'Token penilai tidak valid.';
  END IF;

  IF v_akses.is_digunakan THEN
    RAISE EXCEPTION 'Token sudah pernah digunakan.';
  END IF;

  IF p_nominee_id IS NOT NULL AND p_nominee_id = v_akses.pegawai_id THEN
    RAISE EXCEPTION 'Tidak diperbolehkan memilih diri sendiri (Self-Vote terdeteksi).';
  END IF;

  INSERT INTO suara_quick_vote (periode_id, penilai_id, nominee_pilihan_id)
  VALUES (v_akses.periode_id, v_akses.pegawai_id, p_nominee_id);

  -- Tandai token terpakai
  UPDATE akses_penilai SET is_digunakan = true, submitted_at = now() WHERE id = v_akses.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_video_profil_nominee (
  p_token      uuid,
  p_video_link text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_periode_id BIGINT;
  v_nominee_id BIGINT;
BEGIN
  -- Dapatkan periode_id dan nominee_id dari token yang valid dan belum dikunci (submitted_at IS NULL / is_digunakan = false)
  SELECT periode_id, nominee_id INTO v_periode_id, v_nominee_id
  FROM akses_nominee
  WHERE token_akses = p_token AND is_digunakan = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token tidak valid atau form sudah disubmit secara final.';
  END IF;

  UPDATE nominee_periode
  SET video_profil_link = p_video_link
  WHERE periode_id = v_periode_id AND pegawai_id = v_nominee_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_vote_mode_1c (
  p_token       uuid,
  p_kategori_id bigint,
  p_nominee_id  bigint
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
  DECLARE
      v_voter_id BIGINT;
      v_periode_id BIGINT;
      v_token_periode_id BIGINT;
      v_kategori_periode_id BIGINT;
      v_nominee_in_periode BOOLEAN;
  BEGIN
      SELECT ap.pegawai_id, ap.periode_id
      INTO v_voter_id, v_token_periode_id
      FROM akses_penilai ap
      WHERE ap.token_akses = p_token LIMIT 1;

      IF v_voter_id IS NULL THEN
          RAISE EXCEPTION 'Token tidak valid atau tidak ditemukan.';
      END IF;

      SELECT id INTO v_periode_id
      FROM periode_penilaian
      WHERE id = v_token_periode_id AND mode_penilaian = 'MODE_1B';

      IF v_periode_id IS NULL THEN
          RAISE EXCEPTION 'Token ini bukan untuk voting MODE_1B.';
      END IF;

      SELECT periode_id INTO v_kategori_periode_id
      FROM voting_kategori WHERE id = p_kategori_id;

      IF v_kategori_periode_id <> v_periode_id THEN
          RAISE EXCEPTION 'Kategori tidak valid untuk periode ini.';
      END IF;

      SELECT EXISTS(SELECT 1 FROM nominee_periode
          WHERE periode_id = v_periode_id AND pegawai_id = p_nominee_id)
      INTO v_nominee_in_periode;

      IF NOT v_nominee_in_periode THEN
          RAISE EXCEPTION 'Nominee tidak valid untuk periode ini.';
      END IF;

      IF v_voter_id = p_nominee_id THEN
          RAISE EXCEPTION 'Tidak diperbolehkan memilih diri sendiri.';
      END IF;

      INSERT INTO suara_kategori_vote (periode_id, voter_id, kategori_id, nominee_id)
      VALUES (v_periode_id, v_voter_id, p_kategori_id, p_nominee_id)
      ON CONFLICT (periode_id, voter_id, kategori_id)
      DO UPDATE SET nominee_id = p_nominee_id;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.submit_votes_mode_1c (
  p_token uuid,
  p_votes jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_akses_id BIGINT; v_voter_id BIGINT; v_periode_id BIGINT; v_vote JSONB;
    v_kategori_id BIGINT; v_nominee_id BIGINT; v_total_kategori INT;
BEGIN
    SELECT ap.id, ap.pegawai_id, ap.periode_id INTO v_akses_id, v_voter_id, v_periode_id
    FROM akses_penilai ap WHERE ap.token_akses = p_token LIMIT 1;

    IF v_voter_id IS NULL THEN RAISE EXCEPTION 'Token tidak valid'; END IF;

    SELECT COUNT(*) INTO v_total_kategori FROM voting_kategori WHERE periode_id = v_periode_id;
    IF jsonb_array_length(p_votes) <> v_total_kategori THEN
        RAISE EXCEPTION 'Wajib vote semua % kategori', v_total_kategori;
    END IF;

    FOR v_vote IN SELECT * FROM jsonb_array_elements(p_votes) LOOP
        v_kategori_id := (v_vote->>'kategori_id')::BIGINT;
        v_nominee_id := (v_vote->>'nominee_id')::BIGINT;
        IF v_nominee_id IS NOT NULL AND v_voter_id = v_nominee_id THEN 
            RAISE EXCEPTION 'Tidak boleh pilih diri sendiri'; 
        END IF;
        
        INSERT INTO suara_kategori_vote (periode_id, voter_id, kategori_id, nominee_id)
        VALUES (v_periode_id, v_voter_id, v_kategori_id, v_nominee_id)
        ON CONFLICT (periode_id, voter_id, kategori_id) DO UPDATE SET nominee_id = v_nominee_id;
    END LOOP;

    -- Tandai token terpakai
    UPDATE akses_penilai SET is_digunakan = true, submitted_at = now() WHERE id = v_akses_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tandai_akses_juri_terpakai (
  p_token uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  UPDATE juri_periode SET is_digunakan = true, submitted_at = now() WHERE token_akses = p_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tandai_akses_nominee_terpakai (
  p_token uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  UPDATE akses_nominee SET is_digunakan = true, submitted_at = now() WHERE token_akses = p_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tandai_akses_penilai_terpakai (
  p_token uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  UPDATE akses_penilai SET is_digunakan = true, submitted_at = now() WHERE token_akses = p_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verifikasi_identitas_penilai (
  p_nip text,
  p_hp  text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$ DECLARE v_pegawai_id BIGINT; v_pegawai_name TEXT; v_result JSONB; v_periode_list JSONB; BEGIN SELECT id, nama INTO v_pegawai_id, v_pegawai_name FROM pegawai WHERE nip LIKE '%' || p_nip AND no_hp LIKE '%' || p_hp AND is_active = TRUE LIMIT 1; IF v_pegawai_id IS NULL THEN RAISE EXCEPTION 'Pegawai tidak ditemukan'; END IF; SELECT COALESCE(jsonb_agg(jsonb_build_object('token', ap.token_akses, 'periode_id', pp.id, 'nama_periode', pp.nama_periode, 'mode_penilaian', pp.mode_penilaian, 'tgl_mulai', pp.tgl_mulai, 'tgl_selesai', pp.tgl_selesai, 'status_periode', pp.status, 'status_akses', CASE WHEN ap.is_digunakan THEN 'SUDAH_DIGUNAKAN' ELSE 'BELUM_DIGUNAKAN' END, 'submitted_at', ap.submitted_at) ORDER BY ap.is_digunakan ASC, pp.tgl_selesai DESC), '[]'::jsonb) INTO v_periode_list FROM akses_penilai ap JOIN periode_penilaian pp ON pp.id = ap.periode_id WHERE ap.pegawai_id = v_pegawai_id AND pp.status = 'BERJALAN' AND NOW() BETWEEN pp.tgl_mulai AND pp.tgl_selesai; v_result := jsonb_build_object('pegawai', jsonb_build_object('id', v_pegawai_id, 'nama', v_pegawai_name), 'periode_list', v_periode_list); RETURN v_result; END $function$;

CREATE OR REPLACE FUNCTION public.verifikasi_identitas_universal (
  p_nip text,
  p_hp  text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_pegawai record;
    v_periode_list json;
BEGIN
    -- 1. Cari Pegawai berdasarkan 5 digit NIP & HP
    SELECT id, nama, nip, no_hp 
    INTO v_pegawai
    FROM pegawai 
    WHERE RIGHT(REGEXP_REPLACE(nip, '\D', '', 'g'), 5) = p_nip
      AND RIGHT(REGEXP_REPLACE(no_hp, '\D', '', 'g'), 5) = p_hp
    LIMIT 1;

    IF v_pegawai.id IS NULL THEN
        RAISE EXCEPTION 'NIP atau nomor HP tidak cocok dengan data kami.';
    END IF;

    -- 2. Ambil semua token/akses pegawai ini di periode yang aktif
    WITH gabungan_akses AS (
        -- Penilai (Hanya valid di Mode 1A dan 1B)
        SELECT 
            ap.token_akses as token,
            ap.is_digunakan as is_digunakan,
            ap.periode_id,
            'PENILAI' as peran
        FROM akses_penilai ap
        JOIN periode_penilaian p1 ON p1.id = ap.periode_id
        WHERE ap.pegawai_id = v_pegawai.id AND p1.mode_penilaian IN ('MODE_1A', 'MODE_1B')
        
        UNION ALL
        
        -- Nominee (Valid di semua Mode)
        SELECT 
            an.token_akses as token,
            an.is_digunakan as is_digunakan,
            an.periode_id,
            'KANDIDAT / NOMINEE' as peran
        FROM akses_nominee an
        WHERE an.nominee_id = v_pegawai.id
        
        UNION ALL
        
        -- Juri (Hanya valid di Mode 2)
        SELECT 
            jp.token_akses as token,
            jp.is_digunakan as is_digunakan,
            jp.periode_id,
            'JURI' as peran
        FROM juri_periode jp
        JOIN periode_penilaian p2 ON p2.id = jp.periode_id
        WHERE jp.pegawai_id = v_pegawai.id AND p2.mode_penilaian = 'MODE_2'
    )
    SELECT json_agg(
        json_build_object(
            'token', ga.token,
            'is_digunakan', ga.is_digunakan,
            'periode_id', ga.periode_id,
            'peran', ga.peran,
            'nama_periode', pp.nama_periode,
            'mode_penilaian', pp.mode_penilaian
        )
    ) INTO v_periode_list
    FROM gabungan_akses ga
    JOIN periode_penilaian pp ON pp.id = ga.periode_id
    WHERE pp.status = 'BERJALAN';

    -- 3. Jika tidak ada periode aktif yang bisa diakses
    IF v_periode_list IS NULL THEN
        RAISE EXCEPTION 'Tidak ada periode penilaian aktif untuk Anda saat ini.';
    END IF;

    -- 4. Kembalikan gabungan data JSON
    RETURN json_build_object(
        'pegawai', json_build_object('id', v_pegawai.id, 'nama', v_pegawai.nama),
        'periode_list', v_periode_list
    );
END;
$function$;

ALTER TABLE "public"."log_aktivitas"
  ADD CONSTRAINT "log_aktivitas_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."akses_nominee"
  ADD CONSTRAINT "akses_nominee_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."akses_penilai"
  ADD CONSTRAINT "akses_penilai_pegawai_id_fkey" FOREIGN KEY (pegawai_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."jawaban_nominee"
  ADD CONSTRAINT "jawaban_nominee_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."juri_periode"
  ADD CONSTRAINT "juri_periode_pegawai_id_fkey" FOREIGN KEY (pegawai_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."keputusan_kakan"
  ADD CONSTRAINT "keputusan_kakan_kakan_id_fkey" FOREIGN KEY (kakan_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."keputusan_kakan"
  ADD CONSTRAINT "keputusan_kakan_pemenang_id_fkey" FOREIGN KEY (pemenang_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."log_aktivitas"
  ADD CONSTRAINT "log_aktivitas_pegawai_id_fkey" FOREIGN KEY (pegawai_id) REFERENCES public.pegawai(id) ON DELETE SET NULL;

ALTER TABLE "public"."log_notifikasi_email"
  ADD CONSTRAINT "log_notifikasi_email_pegawai_id_fkey" FOREIGN KEY (pegawai_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."log_notifikasi_wa"
  ADD CONSTRAINT "log_notifikasi_wa_pegawai_id_fkey" FOREIGN KEY (pegawai_id) REFERENCES public.pegawai(id);

ALTER TABLE "public"."nominee_periode"
  ADD CONSTRAINT "nominee_periode_pegawai_id_fkey" FOREIGN KEY (pegawai_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."pegawai"
  ADD CONSTRAINT "pegawai_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."pemenang_per_kategori"
  ADD CONSTRAINT "pemenang_per_kategori_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_juri"
  ADD CONSTRAINT "penilaian_juri_juri_id_fkey" FOREIGN KEY (juri_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_juri"
  ADD CONSTRAINT "penilaian_juri_kategori_id_fkey" FOREIGN KEY (kategori_id) REFERENCES public.kategori_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_juri"
  ADD CONSTRAINT "penilaian_juri_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_mode2a"
  ADD CONSTRAINT "penilaian_mode2a_kriteria_id_fkey" FOREIGN KEY (kriteria_id) REFERENCES public.kriteria_mode2a(id);

ALTER TABLE "public"."penilaian_mode2a"
  ADD CONSTRAINT "penilaian_mode2a_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id);

ALTER TABLE "public"."penilaian_mode2a"
  ADD CONSTRAINT "penilaian_mode2a_penilai_id_fkey" FOREIGN KEY (penilai_id) REFERENCES public.pegawai(id);

ALTER TABLE "public"."penilaian_skor"
  ADD CONSTRAINT "penilaian_skor_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_skor"
  ADD CONSTRAINT "penilaian_skor_penilai_id_fkey" FOREIGN KEY (penilai_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."periode_penilaian"
  ADD CONSTRAINT "periode_penilaian_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.pegawai(id) ON DELETE SET NULL;

ALTER TABLE "public"."akses_nominee"
  ADD CONSTRAINT "akses_nominee_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."akses_penilai"
  ADD CONSTRAINT "akses_penilai_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."jawaban_nominee"
  ADD CONSTRAINT "jawaban_nominee_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."juri_periode"
  ADD CONSTRAINT "juri_periode_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."kategori_penilaian"
  ADD CONSTRAINT "kategori_penilaian_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."keputusan_kakan"
  ADD CONSTRAINT "keputusan_kakan_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."kriteria_mode2a"
  ADD CONSTRAINT "kriteria_mode2a_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."log_notifikasi_email"
  ADD CONSTRAINT "log_notifikasi_email_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."log_notifikasi_wa"
  ADD CONSTRAINT "log_notifikasi_wa_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."nominee_periode"
  ADD CONSTRAINT "nominee_periode_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."pemenang_per_kategori"
  ADD CONSTRAINT "pemenang_per_kategori_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_juri"
  ADD CONSTRAINT "penilaian_juri_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_mode2a"
  ADD CONSTRAINT "penilaian_mode2a_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_skor"
  ADD CONSTRAINT "penilaian_skor_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."periode_unit_kerja"
  ADD CONSTRAINT "periode_unit_kerja_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."pertanyaan"
  ADD CONSTRAINT "pertanyaan_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."jawaban_nominee"
  ADD CONSTRAINT "jawaban_nominee_pertanyaan_id_fkey" FOREIGN KEY (pertanyaan_id) REFERENCES public.pertanyaan(id) ON DELETE CASCADE;

ALTER TABLE "public"."penilaian_skor"
  ADD CONSTRAINT "penilaian_skor_pertanyaan_id_fkey" FOREIGN KEY (pertanyaan_id) REFERENCES public.pertanyaan(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_kategori_vote"
  ADD CONSTRAINT "suara_kategori_vote_nominee_id_fkey" FOREIGN KEY (nominee_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_kategori_vote"
  ADD CONSTRAINT "suara_kategori_vote_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_kategori_vote"
  ADD CONSTRAINT "suara_kategori_vote_voter_id_fkey" FOREIGN KEY (voter_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_quick_vote"
  ADD CONSTRAINT "suara_quick_vote_nominee_pilihan_id_fkey" FOREIGN KEY (nominee_pilihan_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_quick_vote"
  ADD CONSTRAINT "suara_quick_vote_penilai_id_fkey" FOREIGN KEY (penilai_id) REFERENCES public.pegawai(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_quick_vote"
  ADD CONSTRAINT "suara_quick_vote_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."template_pesan_wa"
  ADD CONSTRAINT "template_pesan_wa_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.pegawai(id);

ALTER TABLE "public"."log_notifikasi_wa"
  ADD CONSTRAINT "log_notifikasi_wa_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.template_pesan_wa(id);

ALTER TABLE "public"."voting_kategori"
  ADD CONSTRAINT "voting_kategori_periode_id_fkey" FOREIGN KEY (periode_id) REFERENCES public.periode_penilaian(id) ON DELETE CASCADE;

ALTER TABLE "public"."pemenang_per_kategori"
  ADD CONSTRAINT "pemenang_per_kategori_kategori_id_fkey" FOREIGN KEY (kategori_id) REFERENCES public.voting_kategori(id) ON DELETE CASCADE;

ALTER TABLE "public"."suara_kategori_vote"
  ADD CONSTRAINT "suara_kategori_vote_kategori_id_fkey" FOREIGN KEY (kategori_id) REFERENCES public.voting_kategori(id) ON DELETE CASCADE;

ALTER TABLE "public"."pegawai"
  ADD CONSTRAINT "pegawai_wilayah_id_fkey" FOREIGN KEY (wilayah_id) REFERENCES public.wilayah(id) ON DELETE CASCADE;

ALTER TABLE "public"."periode_penilaian"
  ADD CONSTRAINT "periode_penilaian_wilayah_id_fkey" FOREIGN KEY (wilayah_id) REFERENCES public.wilayah(id) ON DELETE CASCADE;

ALTER TABLE "public"."periode_unit_kerja"
  ADD CONSTRAINT "periode_unit_kerja_wilayah_id_fkey" FOREIGN KEY (wilayah_id) REFERENCES public.wilayah(id) ON DELETE CASCADE;

ALTER TABLE "public"."wilayah"
  ADD CONSTRAINT "wilayah_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.wilayah(id) ON DELETE SET NULL;

CREATE VIEW "public"."view_tabulasi_mode2a_summary" WITH (security_invoker=off) AS  SELECT pm.periode_id,
    pm.nominee_id,
    pg.nama AS nama_nominee,
    pg.nip AS nip_nominee,
    pg.foto_url AS foto_nominee,
    w.nama_wilayah AS unit_kerja,
    count(DISTINCT pm.penilai_id) AS total_pemilih,
    count(pm.id) AS total_skor,
    round(avg(pm.skor), 2) AS rata_rata_skor,
    min(pm.skor) AS skor_terendah,
    max(pm.skor) AS skor_tertinggi,
    dense_rank() OVER (PARTITION BY pm.periode_id ORDER BY (avg(pm.skor)) DESC, (count(DISTINCT pm.penilai_id)) DESC) AS peringkat
   FROM ((public.penilaian_mode2a pm
     JOIN public.pegawai pg ON ((pm.nominee_id = pg.id)))
     LEFT JOIN public.wilayah w ON ((pg.wilayah_id = w.id)))
  GROUP BY pm.periode_id, pm.nominee_id, pg.nama, pg.nip, pg.foto_url, w.nama_wilayah
  ORDER BY pm.periode_id, (dense_rank() OVER (PARTITION BY pm.periode_id ORDER BY (avg(pm.skor)) DESC, (count(DISTINCT pm.penilai_id)) DESC));

CREATE VIEW "public"."view_tabulasi_mode2a" WITH (security_invoker=off) AS  SELECT pm.periode_id,
    pm.nominee_id,
    pg.nama AS nama_nominee,
    pg.nip,
    pg.nip_baru,
    pg.foto_url,
    w.nama_wilayah AS unit_kerja,
    count(DISTINCT pm.penilai_id) AS total_pemilih,
    count(pm.id) AS total_skor,
    round(avg(pm.skor), 2) AS rata_rata_skor,
    min(pm.skor) AS skor_terendah,
    max(pm.skor) AS skor_tertinggi,
    dense_rank() OVER (PARTITION BY pm.periode_id ORDER BY (avg(pm.skor)) DESC, (count(DISTINCT pm.penilai_id)) DESC) AS peringkat
   FROM ((public.penilaian_mode2a pm
     JOIN public.pegawai pg ON ((pm.nominee_id = pg.id)))
     LEFT JOIN public.wilayah w ON ((pg.wilayah_id = w.id)))
  GROUP BY pm.periode_id, pm.nominee_id, pg.nama, pg.nip, pg.nip_baru, pg.foto_url, w.nama_wilayah
  ORDER BY pm.periode_id, (dense_rank() OVER (PARTITION BY pm.periode_id ORDER BY (avg(pm.skor)) DESC, (count(DISTINCT pm.penilai_id)) DESC));

CREATE VIEW "public"."view_tabulasi_mode_1a" WITH (security_invoker=off) AS  SELECT pp.id AS periode_id,
    pp.wilayah_id,
    pp.jumlah_kandidat_kakan,
    p.id AS nominee_id,
    p.nama AS nama_nominee,
    p.nip,
    p.nip_baru,
    COALESCE(w.nama_unit_kerja, w.nama_wilayah) AS unit_kerja,
    p.foto_url,
    count(DISTINCT ps.penilai_id) AS total_partisipan,
    COALESCE(round(avg(((((ps.skor - pert.skor_min))::numeric / ((pert.skor_max - pert.skor_min))::numeric) * (100)::numeric)), 2), 0.00) AS skor_akhir_persen,
    dense_rank() OVER (PARTITION BY pp.id ORDER BY COALESCE(avg(((((ps.skor - pert.skor_min))::numeric / ((pert.skor_max - pert.skor_min))::numeric) * (100)::numeric)), (0)::numeric) DESC, (count(DISTINCT ps.penilai_id)) DESC) AS peringkat
   FROM (((((public.nominee_periode np
     JOIN public.pegawai p ON ((np.pegawai_id = p.id)))
     LEFT JOIN public.wilayah w ON ((p.wilayah_id = w.id)))
     JOIN public.periode_penilaian pp ON ((np.periode_id = pp.id)))
     LEFT JOIN public.penilaian_skor ps ON (((np.periode_id = ps.periode_id) AND (np.pegawai_id = ps.nominee_id))))
     LEFT JOIN public.pertanyaan pert ON ((ps.pertanyaan_id = pert.id)))
  WHERE (pp.mode_penilaian = 'MODE_1A'::public.mode_penilaian_enum)
  GROUP BY pp.id, pp.wilayah_id, pp.jumlah_kandidat_kakan, p.id, p.nama, p.nip, p.nip_baru, w.nama_unit_kerja, w.nama_wilayah, p.foto_url;

CREATE VIEW "public"."view_tabulasi_mode_1b" WITH (security_invoker=off) AS  WITH base_votes AS (
         SELECT pp.id AS periode_id,
            pp.wilayah_id,
            p.id AS nominee_id,
            p.nama AS nama_nominee,
            p.nip,
            p.nip_baru,
            COALESCE(w.nama_unit_kerja, w.nama_wilayah) AS unit_kerja,
            p.foto_url,
            count(sqv.id) AS total_suara
           FROM ((((public.nominee_periode np
             JOIN public.pegawai p ON ((np.pegawai_id = p.id)))
             LEFT JOIN public.wilayah w ON ((p.wilayah_id = w.id)))
             JOIN public.periode_penilaian pp ON ((np.periode_id = pp.id)))
             LEFT JOIN public.suara_quick_vote sqv ON (((np.periode_id = sqv.periode_id) AND (np.pegawai_id = sqv.nominee_pilihan_id))))
          WHERE (pp.mode_penilaian = 'MODE_1B'::public.mode_penilaian_enum)
          GROUP BY pp.id, pp.wilayah_id, p.id, p.nama, p.nip, p.nip_baru, w.nama_unit_kerja, w.nama_wilayah, p.foto_url
        ), abstain_votes AS (
         SELECT sqv.periode_id,
            pp.wilayah_id,
            NULL::bigint AS nominee_id,
            'Abstain / Kotak Kosong'::text AS nama_nominee,
            NULL::character varying(30) AS nip,
            NULL::character varying(30) AS nip_baru,
            'Suara Tidak Sah'::text AS unit_kerja,
            'https://ui-avatars.com/api/?name=Kotak+Kosong&background=cbd5e1&color=475569&size=128'::text AS foto_url,
            count(sqv.id) AS total_suara
           FROM (public.suara_quick_vote sqv
             JOIN public.periode_penilaian pp ON ((sqv.periode_id = pp.id)))
          WHERE ((sqv.nominee_pilihan_id IS NULL) AND (pp.mode_penilaian = 'MODE_1B'::public.mode_penilaian_enum))
          GROUP BY sqv.periode_id, pp.wilayah_id
        ), combined_votes AS (
         SELECT base_votes.periode_id,
            base_votes.wilayah_id,
            base_votes.nominee_id,
            base_votes.nama_nominee,
            base_votes.nip,
            base_votes.nip_baru,
            base_votes.unit_kerja,
            base_votes.foto_url,
            base_votes.total_suara
           FROM base_votes
        UNION ALL
         SELECT abstain_votes.periode_id,
            abstain_votes.wilayah_id,
            abstain_votes.nominee_id,
            abstain_votes.nama_nominee,
            abstain_votes.nip,
            abstain_votes.nip_baru,
            abstain_votes.unit_kerja,
            abstain_votes.foto_url,
            abstain_votes.total_suara
           FROM abstain_votes
        )
 SELECT periode_id,
    wilayah_id,
    nominee_id,
    nama_nominee,
    nip,
    nip_baru,
    unit_kerja,
    foto_url,
    total_suara,
    dense_rank() OVER (PARTITION BY periode_id ORDER BY total_suara DESC) AS peringkat
   FROM combined_votes;

CREATE VIEW "public"."view_tabulasi_mode_1c" WITH (security_invoker=off) AS  SELECT vk.periode_id,
    vk.id AS kategori_id,
    vk.nama_kategori,
    vk.urutan AS kategori_urutan,
    p.id AS nominee_id,
    p.nama AS nama_nominee,
    p.nip,
    p.nip_baru,
    COALESCE(w.nama_unit_kerja, w.nama_wilayah) AS unit_kerja,
    p.foto_url,
    count(skv.id) AS total_suara,
    dense_rank() OVER (PARTITION BY vk.id ORDER BY (count(skv.id)) DESC) AS peringkat_dalam_kategori,
    rank() OVER (PARTITION BY vk.periode_id ORDER BY (count(skv.id)) DESC) AS peringkat_keseluruhan
   FROM ((((public.voting_kategori vk
     CROSS JOIN public.nominee_periode np)
     JOIN public.pegawai p ON ((np.pegawai_id = p.id)))
     LEFT JOIN public.suara_kategori_vote skv ON (((vk.id = skv.kategori_id) AND (np.pegawai_id = skv.nominee_id))))
     LEFT JOIN public.wilayah w ON ((p.wilayah_id = w.id)))
  WHERE (np.periode_id = vk.periode_id)
  GROUP BY vk.periode_id, vk.id, vk.nama_kategori, vk.urutan, p.id, p.nama, p.nip, p.nip_baru, w.nama_unit_kerja, w.nama_wilayah, p.foto_url;

CREATE VIEW "public"."view_tabulasi_mode_2" WITH (security_invoker=off) AS  SELECT pp.id AS periode_id,
    p.id AS nominee_id,
    p.nama AS nama_nominee,
    p.nip,
    p.nip_baru,
    COALESCE(w.nama_unit_kerja, w.nama_wilayah) AS unit_kerja,
    p.foto_url,
    COALESCE(round(avg(skor_juri.total_weighted_skor), 2), 0.00) AS skor_akhir_juri,
    count(DISTINCT skor_juri.juri_id) AS jumlah_juri_selesai,
    dense_rank() OVER (PARTITION BY pp.id ORDER BY COALESCE(avg(skor_juri.total_weighted_skor), (0)::numeric) DESC) AS peringkat
   FROM ((((public.nominee_periode np
     JOIN public.pegawai p ON ((np.pegawai_id = p.id)))
     LEFT JOIN public.wilayah w ON ((p.wilayah_id = w.id)))
     JOIN public.periode_penilaian pp ON ((np.periode_id = pp.id)))
     LEFT JOIN ( SELECT pj.periode_id,
            pj.juri_id,
            pj.nominee_id,
            sum((pj.skor * (kp.bobot_persen / (100)::numeric))) AS total_weighted_skor
           FROM (public.penilaian_juri pj
             JOIN public.kategori_penilaian kp ON ((pj.kategori_id = kp.id)))
          GROUP BY pj.periode_id, pj.juri_id, pj.nominee_id) skor_juri ON (((np.periode_id = skor_juri.periode_id) AND (np.pegawai_id = skor_juri.nominee_id))))
  WHERE (pp.mode_penilaian = 'MODE_2'::public.mode_penilaian_enum)
  GROUP BY pp.id, p.id, p.nama, p.nip, p.nip_baru, w.nama_unit_kerja, w.nama_wilayah, p.foto_url;

CREATE INDEX idx_juri_skor_lookup ON public.penilaian_juri USING btree (periode_id, nominee_id);

CREATE INDEX idx_kontak_is_active ON public.kontak USING btree (is_active);

CREATE INDEX idx_kontak_kategori ON public.kontak USING btree (kategori);

CREATE INDEX idx_log_email_periode ON public.log_notifikasi_email USING btree (periode_id);

CREATE INDEX idx_log_email_status ON public.log_notifikasi_email USING btree (status);

CREATE INDEX idx_log_notifikasi_pegawai ON public.log_notifikasi_wa USING btree (pegawai_id);

CREATE INDEX idx_log_notifikasi_periode ON public.log_notifikasi_wa USING btree (periode_id);

CREATE INDEX idx_log_notifikasi_status ON public.log_notifikasi_wa USING btree (status);

CREATE INDEX idx_notifikasi_created_at ON public.notifikasi USING btree (created_at DESC);

CREATE INDEX idx_notifikasi_jenis ON public.notifikasi USING btree (jenis_penerima);

CREATE INDEX idx_notifikasi_status ON public.notifikasi USING btree (status);

CREATE INDEX idx_pegawai_email ON public.pegawai USING btree (email)
  WHERE (email IS NOT NULL);

CREATE INDEX idx_pegawai_no_hp ON public.pegawai USING btree (no_hp)
  WHERE (no_hp IS NOT NULL);

CREATE INDEX idx_pegawai_wilayah ON public.pegawai USING btree (wilayah_id);

CREATE INDEX idx_pemenang_kategori ON public.pemenang_per_kategori USING btree (kategori_id);

CREATE INDEX idx_pemenang_periode ON public.pemenang_per_kategori USING btree (periode_id);

CREATE INDEX idx_periode_unit_wilayah ON public.periode_unit_kerja USING btree (wilayah_id);

CREATE INDEX idx_periode_wilayah_status ON public.periode_penilaian USING btree (wilayah_id, status);

CREATE INDEX idx_quick_vote_lookup ON public.suara_quick_vote USING btree (periode_id, nominee_pilihan_id);

CREATE INDEX idx_skor_lookup ON public.penilaian_skor USING btree (periode_id, nominee_id);

CREATE INDEX idx_suara_vote_kategori ON public.suara_kategori_vote USING btree (kategori_id);

CREATE INDEX idx_suara_vote_periode ON public.suara_kategori_vote USING btree (periode_id);

CREATE INDEX idx_token_juri_hash ON public.juri_periode USING btree (token_akses);

CREATE INDEX idx_token_nominee_hash ON public.akses_nominee USING btree (token_akses);

CREATE INDEX idx_token_penilai_hash ON public.akses_penilai USING btree (token_akses);

CREATE INDEX idx_voting_kategori_periode ON public.voting_kategori USING btree (periode_id);

CREATE TRIGGER update_kriteria_mode2a_updated_at
  BEFORE UPDATE ON public.kriteria_mode2a
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penilaian_mode2a_updated_at
  BEFORE UPDATE ON public.penilaian_mode2a
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin Kelola Token Nominee" ON "public"."akses_nominee"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.pegawai p
  WHERE ((p.user_id = auth.uid()) AND (p.role_admin <> 'USER_BIASA'::public.user_role_enum)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pegawai p
  WHERE ((p.user_id = auth.uid()) AND (p.role_admin <> 'USER_BIASA'::public.user_role_enum)))));

CREATE POLICY "Admin Kelola Token Penilai" ON "public"."akses_penilai"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.pegawai p
  WHERE ((p.user_id = auth.uid()) AND (p.role_admin <> 'USER_BIASA'::public.user_role_enum)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pegawai p
  WHERE ((p.user_id = auth.uid()) AND (p.role_admin <> 'USER_BIASA'::public.user_role_enum)))));

CREATE POLICY "Admin full access" ON "public"."jawaban_nominee"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public Read Access Jawaban Nominee" ON "public"."jawaban_nominee"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public read access" ON "public"."jawaban_nominee"
  FOR SELECT
  TO "anon"
  USING (true);

CREATE POLICY "Admin Kelola Token Juri" ON "public"."juri_periode"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.pegawai p
  WHERE ((p.user_id = auth.uid()) AND (p.role_admin <> 'USER_BIASA'::public.user_role_enum)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pegawai p
  WHERE ((p.user_id = auth.uid()) AND (p.role_admin <> 'USER_BIASA'::public.user_role_enum)))));

CREATE POLICY "Admin Kelola Kategori" ON "public"."kategori_penilaian"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Kategori" ON "public"."kategori_penilaian"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Public Access Keputusan Kakan" ON "public"."keputusan_kakan"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read" ON "public"."kontak"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Service role full access" ON "public"."kontak"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Allow anon read kriteria_mode2a" ON "public"."kriteria_mode2a"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow auth delete kriteria_mode2a" ON "public"."kriteria_mode2a"
  FOR DELETE
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Allow auth insert kriteria_mode2a" ON "public"."kriteria_mode2a"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.role() = 'authenticated'::text));

CREATE POLICY "Allow auth update kriteria_mode2a" ON "public"."kriteria_mode2a"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Public Insert Log Aktivitas" ON "public"."log_aktivitas"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Admin dapat melihat semua log email" ON "public"."log_notifikasi_email"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Izinkan insert log email" ON "public"."log_notifikasi_email"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Admin dapat melihat semua log WA" ON "public"."log_notifikasi_wa"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Izinkan insert log WA" ON "public"."log_notifikasi_wa"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Admin Kelola Nominee Periode" ON "public"."nominee_periode"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Nominee" ON "public"."nominee_periode"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Authenticated users can read" ON "public"."notifikasi"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Service role full access" ON "public"."notifikasi"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Admin Kelola Pegawai" ON "public"."pegawai"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Pegawai" ON "public"."pegawai"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "pemenang_per_kategori_all" ON "public"."pemenang_per_kategori"
  FOR ALL
  TO PUBLIC
  USING (true);

CREATE POLICY "Public Insert Skor Mode 2" ON "public"."penilaian_juri"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon insert penilaian_mode2a" ON "public"."penilaian_mode2a"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow anon read penilaian_mode2a" ON "public"."penilaian_mode2a"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow anon update penilaian_mode2a" ON "public"."penilaian_mode2a"
  FOR UPDATE
  TO PUBLIC
  USING (true);

CREATE POLICY "Public Insert Skor Mode 1a" ON "public"."penilaian_skor"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Admin Kelola Periode" ON "public"."periode_penilaian"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Periode" ON "public"."periode_penilaian"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Admin Kelola Periode Unit Kerja" ON "public"."periode_unit_kerja"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Periode Unit Kerja" ON "public"."periode_unit_kerja"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Admin Kelola Pertanyaan" ON "public"."pertanyaan"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Pertanyaan" ON "public"."pertanyaan"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "suara_kategori_vote_all" ON "public"."suara_kategori_vote"
  FOR ALL
  TO PUBLIC
  USING (true);

CREATE POLICY "Public Insert Quick Vote Mode 1b" ON "public"."suara_quick_vote"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow delete all" ON "public"."template_pesan_wa"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow insert all" ON "public"."template_pesan_wa"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Allow select all" ON "public"."template_pesan_wa"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Allow update all" ON "public"."template_pesan_wa"
  FOR UPDATE
  TO PUBLIC
  USING (true);

CREATE POLICY "voting_kategori_all" ON "public"."voting_kategori"
  FOR ALL
  TO PUBLIC
  USING (true);

CREATE POLICY "Admin Kelola Wilayah" ON "public"."wilayah"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin_aktif())
  WITH CHECK (public.is_admin_aktif());

CREATE POLICY "Public Read Access Wilayah" ON "public"."wilayah"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Izinkan baca dokumen anonim" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'dokumen-bukti'::text));

CREATE POLICY "Izinkan upload dokumen anonim" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'dokumen-bukti'::text));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."akses_nominee";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."akses_penilai";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."juri_periode";

COMMENT ON COLUMN "public"."juri_periode"."blocked_nominee_ids" IS 'Array berisi pegawai_id dari nominee yang diblokir oleh admin (Custom Blacklist)';

GRANT EXECUTE ON FUNCTION "public"."auto_generate_pemenang_per_kategori"(bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."check_total_bobot_kategori"(bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."generate_token_penilaian_masal"(bigint, bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."generate_token_penilaian_multi_unit"(bigint, bigint[]) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_akses_juri_by_token"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_akses_nominee_by_token"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_akses_penilai_by_token"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_draft_penilai"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_jumlah_juri_periode"(bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_kelengkapan_penilai"(bigint, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_penilaian_mode2a_by_token"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_uid_by_email"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_votes_by_voter_token"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."get_voting_kategori_by_periode"(bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_admin_aktif"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reset_akses_penilai_universal"(bigint, bigint, bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reset_penilaian_mode2a"(bigint, bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reset_seluruh_data_periode"(bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."save_draft_penilai"(uuid, text, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_bukti_nominee_mode2"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_jawaban_nominee"(uuid, bigint, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_penilaian_mode2a"(uuid, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_penilaian_mode_1a"(uuid, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_penilaian_mode_2"(uuid, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_quick_vote_mode_1b"(uuid, bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_video_profil_nominee"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_vote_mode_1c"(uuid, bigint, bigint) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."submit_votes_mode_1c"(uuid, jsonb) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."tandai_akses_juri_terpakai"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."tandai_akses_nominee_terpakai"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."tandai_akses_penilai_terpakai"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."verifikasi_identitas_penilai"(text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."verifikasi_identitas_universal"(text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."akses_nominee_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."akses_penilai_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."jawaban_nominee_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."juri_periode_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."kategori_penilaian_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."keputusan_kakan_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."kontak_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."kriteria_mode2a_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."log_aktivitas_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."log_notifikasi_wa_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."nominee_periode_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."notifikasi_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."pegawai_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."pemenang_per_kategori_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."penilaian_juri_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."penilaian_mode2a_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."penilaian_skor_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."periode_penilaian_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."periode_unit_kerja_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."pertanyaan_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."suara_kategori_vote_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."suara_quick_vote_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."template_pesan_wa_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."voting_kategori_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."wilayah_id_seq" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."akses_nominee" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."akses_penilai" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."jawaban_nominee" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."juri_periode" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."kategori_penilaian" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."keputusan_kakan" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."kontak" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."kriteria_mode2a" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."log_aktivitas" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."log_notifikasi_email" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."log_notifikasi_wa" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."nominee_periode" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifikasi" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pegawai" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pemenang_per_kategori" TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."penilaian_juri" FROM "anon";

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."penilaian_juri" TO "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."penilaian_juri" TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."penilaian_mode2a" TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."penilaian_skor" FROM "anon";

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."penilaian_skor" TO "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."penilaian_skor" TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."periode_penilaian" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."periode_unit_kerja" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pertanyaan" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."suara_kategori_vote" TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."suara_quick_vote" FROM "anon";

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."suara_quick_vote" TO "anon";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."suara_quick_vote" TO "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."template_pesan_wa" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."voting_kategori" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wilayah" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."mode_penilaian_enum" TO "postgres";

GRANT USAGE ON TYPE "public"."status_periode_enum" TO "postgres";

GRANT USAGE ON TYPE "public"."user_role_enum" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."view_tabulasi_mode2a" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE "public"."view_tabulasi_mode2a_summary"
  TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."view_tabulasi_mode_1a" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."view_tabulasi_mode_1b" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."view_tabulasi_mode_1c" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."view_tabulasi_mode_2" TO "anon", "authenticated", "postgres", "service_role";


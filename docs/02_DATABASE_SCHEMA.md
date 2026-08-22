# Database Schema Documentation

> Extracted from `supabase/00_deploy_master.sql`

---

## Enums

### user_role_enum
```sql
'SUPER_ADMIN' | 'ADMIN_PROVINSI' | 'ADMIN_KABKOTA' | 'USER_BIASA'
```

### mode_penilaian_enum
```sql
'MODE_1A' | 'MODE_1B' | 'MODE_2' | 'MODE_2A'
```

### status_periode_enum
```sql
'DRAFT' | 'BERJALAN' | 'SELESAI' | 'DIARSIPKAN'
```

---

## Core Tables

### wilayah
Hierarchical regions (PROVINSI + KABKOTA)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| nama_wilayah | text | NOT NULL |
| level | integer | CHECK (level IN (1, 2)) |
| parent_id | uuid | REFERENCES wilayah(id) |
| nama_unit_kerja | text | |
| created_at | timestamptz | DEFAULT now() |

### pegawai
Employee master data

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| nama | text | NOT NULL |
| nip | text | UNIQUE |
| nip_baru | text | |
| email | text | |
| no_hp | text | |
| role_admin | user_role_enum | DEFAULT 'USER_BIASA' |
| is_kakan | boolean | DEFAULT false |
| foto_url | text | |
| is_active | boolean | DEFAULT true |
| golongan | text | |
| jabatan | text | |
| user_id | uuid | REFERENCES auth.users |
| created_at | timestamptz | |

### periode_penilaian
Assessment periods

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| nama_periode | text | NOT NULL |
| mode_penilaian | mode_penilaian_enum | NOT NULL |
| status | status_periode_enum | DEFAULT 'DRAFT' |
| tgl_mulai | timestamptz | |
| tgl_selesai | timestamptz | |
| petunjuk_penilaian | text | |
| jumlah_kandidat_kakan | integer | DEFAULT 3 |
| created_by | uuid | |
| created_at | timestamptz | |

### periode_unit_kerja
Multi-unit linkage

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| periode_id | uuid | REFERENCES periode_penilaian |
| wilayah_id | uuid | REFERENCES wilayah |

### pertanyaan
Mode 1A questions

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| periode_id | uuid | REFERENCES periode_penilaian |
| urutan | integer | |
| teks_pertanyaan | text | |
| skor_min | integer | DEFAULT 1 |
| skor_max | integer | DEFAULT 100 |

### kategori_penilaian
Mode 2 categories

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| periode_id | uuid | REFERENCES periode_penilaian |
| nama_kategori | text | |
| bobot_persen | integer | CHECK (0-100) |
| skor_min | integer | DEFAULT 1 |
| skor_max | integer | DEFAULT 100 |

### voting_kategori
Mode 1B voting categories

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| periode_id | uuid | REFERENCES periode_penilaian |
| nama_kategori | text | |
| deskripsi | text | |
| urutan | integer | |

### nominee_periode
Nominees per period

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| periode_id | uuid | REFERENCES periode_penilaian |
| pegawai_id | uuid | REFERENCES pegawai |
| created_at | timestamptz | |

### jawaban_nominee
Nominee answers + files

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| nominee_id | uuid | REFERENCES nominee_periode |
| pertanyaan_id | uuid | |
| teks_jawaban | text | |
| file_url | text | |

### akses_penilai
Evaluator tokens (UUID)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| token_akses | uuid | UNIQUE |
| pegawai_id | uuid | REFERENCES pegawai |
| periode_id | uuid | REFERENCES periode_penilaian |
| is_digunakan | boolean | DEFAULT false |
| notifikasi_wa_sent_at | timestamptz | |
| submitted_at | timestamptz | |

### akses_nominee
Nominee upload tokens

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| token_akses | uuid | UNIQUE |
| nominee_id | uuid | REFERENCES nominee_periode |
| is_digunakan | boolean | DEFAULT false |
| notifikasi_wa_sent_at | timestamptz | |
| submitted_at | timestamptz | |

### juri_periode
Jury tokens

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| token_akses | uuid | UNIQUE |
| pegawai_id | uuid | REFERENCES pegawai |
| periode_id | uuid | REFERENCES periode_penilaian |
| is_ketua_juri | boolean | DEFAULT false |
| is_digunakan | boolean | DEFAULT false |
| notifikasi_wa_sent_at | timestamptz | |
| submitted_at | timestamptz | |

### penilaian_skor
Mode 1A scores

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| penilai_id | uuid | REFERENCES pegawai |
| nominee_id | uuid | REFERENCES pegawai |
| pertanyaan_id | uuid | REFERENCES pertanyaan |
| skor | integer | |
| | | CONSTRAINT anti_self_vote_1a CHECK (penilai_id <> nominee_id) |

### suara_quick_vote
Mode 1B flat votes

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| penilai_id | uuid | REFERENCES pegawai |
| nominee_pilihan_id | uuid | REFERENCES pegawai |
| | | CONSTRAINT anti_self_vote_1b CHECK (penilai_id <> nominee_pilihan_id) |

### suara_kategori_vote
Mode 1B hybrid votes

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| voter_id | uuid | REFERENCES pegawai |
| nominee_id | uuid | REFERENCES pegawai |
| kategori_id | uuid | REFERENCES voting_kategori |
| periode_id | uuid | REFERENCES periode_penilaian |
| | | CONSTRAINT anti_self_vote_mode1c CHECK (voter_id <> nominee_id) |

### penilaian_juri
Mode 2 jury scores

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| juri_id | uuid | REFERENCES pegawai |
| nominee_id | uuid | REFERENCES pegawai |
| kategori_id | uuid | REFERENCES kategori_penilaian |
| skor | numeric | |
| catatan_juri | text | |
| | | CONSTRAINT anti_self_vote_mode2 CHECK (juri_id <> nominee_id) |

### penilaian_mode2a
Mode 2A scores

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| penilai_id | uuid | REFERENCES pegawai |
| nominee_id | uuid | REFERENCES pegawai |
| kriteria_id | uuid | |
| skor | numeric | |
| | | CONSTRAINT anti_self_vote_mode2a CHECK (penilai_id <> nominee_id) |

### keputusan_kakan
Winner lock

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| periode_id | uuid | REFERENCES periode_penilaian |
| kakan_id | uuid | REFERENCES pegawai |
| pemenang_id | uuid | REFERENCES pegawai |
| catatan_pertimbangan | text | |

### template_pesan_wa
WA message templates

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| nama_tampilan | text | |
| isi_pesan | text | |
| is_active | boolean | DEFAULT true |
| created_by | uuid | |
| created_at | timestamptz | |

### log_notifikasi_wa
WA sending logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| template_id | uuid | REFERENCES template_pesan_wa |
| periode_id | uuid | REFERENCES periode_penilaian |
| kategori | text | |
| pegawai_id | uuid | REFERENCES pegawai |
| token_id | uuid | |
| nomor_hp | text | |
| isi_pesan | text | |
| status | text | DEFAULT 'PENDING' |
| sent_at | timestamptz | |
| error_message | text | |

### log_aktivitas
Audit trail

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| aksi | text | |
| detail | jsonb | |
| user_id | uuid | |
| created_at | timestamptz | |

---

## Key Views

### view_tabulasi_mode_1a
```sql
-- AVG of normalized scores (0-100%), ranked by score + participation
```

### view_tabulasi_mode_1b
```sql
-- COUNT of votes (flat + per kategori), ranked by count
```

### view_tabulasi_mode_2
```sql
-- Weighted AVG across categories, shows completion status
```

### view_tabulasi_mode_1c
```sql
-- Tabulasi hybrid voting per kategori
```

---

## Key RPC Functions

### Token Fetching (SECURITY DEFINER - critical)

```sql
-- Returns JSONB with access details
get_akses_penilai_by_token(p_token UUID)
get_akses_juri_by_token(p_token UUID)
get_akses_nominee_by_token(p_token UUID)
```

### Submission (atomic with anti-self-vote)

```sql
submit_penilaian_mode_1a(p_token UUID, p_payload_json JSONB)
submit_quick_vote_mode_1b(p_token UUID, p_nominee_id UUID)
submit_all_votes_mode_1c(p_token UUID, p_votes_json JSONB)
submit_penilaian_mode_2(p_token UUID, p_payload_json JSONB)
```

### Token Management

```sql
tandai_akses_penilai_terpakai(p_token UUID)
tandai_akses_juri_terpakai(p_token UUID)
tandai_akses_nominee_terpakai(p_token UUID)
reset_akses_penilai_universal(p_periode_id, p_pegawai_id, p_admin_id)
generate_token_penilaian_multi_unit(p_periode_id, p_wilayah_ids)
```

### Verification (NEW - 2026-08)

```sql
verifikasi_identitas_penilai(p_nip_5digit TEXT, p_hp_5digit TEXT)
-- Returns: { pegawai: {...}, periode_list: [...] }
```

### Validation

```sql
check_total_bobot_kategori(p_periode_id)
get_jumlah_juri_periode(p_periode_id)
```

---

## Self-Vote Prevention Constraints

| Table | Constraint Name | Check |
|-------|-----------------|-------|
| penilaian_skor | anti_self_vote_1a | penilai_id <> nominee_id |
| suara_quick_vote | anti_self_vote_1b | penilai_id <> nominee_pilihan_id |
| suara_kategori_vote | anti_self_vote_mode1c | voter_id <> nominee_id |
| penilaian_juri | anti_self_vote_mode2 | juri_id <> nominee_id |
| penilaian_mode2a | anti_self_vote_mode2a | penilai_id <> nominee_id |

---

## Storage

### Bucket: `dokumen-bukti`
- **Type**: Private
- **Purpose**: Store nominee evidence files
- **Access**: Signed URLs (1-hour expiry)
- **Path Format**: `{periodeId}/{nomineeId}/{pertanyaanId}-{timestamp}.{ext}`

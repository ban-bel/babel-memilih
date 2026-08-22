# User Flows Documentation

---

## Penilai Flow (MODE_1A - Verifikasi Identitas)

```
+------------------------------------------------------------------+
|                     PENILAI ACCESS FLOW (VERIFIKASI)               |
+------------------------------------------------------------------+
|  User accesses /penilai (general link)                            |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Form Input:                                                   |  |
|  |  - 5 digit terakhir NIP                                       |  |
|  |  - 5 digit terakhir nomor HP                                   |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  RPC: verifikasi_identitas_penilai(p_nip_5digit, p_hp_5digit)      |
|       +                                                             |
|  Validates: 5-digit NIP + 5-digit HP matches in pegawai table     |
|       +                                                             |
|  Returns: { pegawai: {...}, periode_list: [...] }                  |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Display Period List (all active periods user can access):    |  |
|  |  - Period name, mode, deadline                                |  |
|  |  - Status badge: BELUM_DIGUNAKAN / SUDAH_DIGUNAKAN            |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  User clicks "Masuk" → Redirect to /penilai/{token_uuid}           |
+------------------------------------------------------------------+
```

### VerifikasiPenilai Page States

1. **Initial**: Show verification form (NIP + HP inputs)
2. **Loading**: Fetching data from RPC
3. **Success**: Display period list with "Masuk" buttons
4. **Error**: Show error message (no match found)
5. **Already Used**: Show message that token already used

---

## Penilai Flow (MODE_1A - Voting)

```
+------------------------------------------------------------------+
|                     MODE_1A VOTING FLOW                            |
+------------------------------------------------------------------+
|  /penilai/{token_uuid}                                             |
|       +                                                             |
|  RPC: get_akses_penilai_by_token(p_token)                         |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Check Token Status:                                           |  |
|  |  - SUDAH_DIGUNAKAN → Show "Sudah提交" success screen          |  |
|  |  - BELUM_DIBUKA → Show "Belum buka" countdown screen          |  |
|  |  - TELAH_DITUTUP → Show "Sudah ditutup" message              |  |
|  |  - AKTIF → Show voting form                                   |  |
|  +---------------------------------------------------------------+  |
|       + (if AKTIF)                                                 |
|  Fetch: Daftar nominees + Pertanyaan (sorted by urutan)           |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Form Display:                                                 |  |
|  |  ┌─────────────────────────────────────────────────────────┐  |  |
|  |  | [Avatar] Budi Santoso                                   │  |  |
|  |  | BPS Provinsi Babel                                      |  |
|  |  |                                                         |  |  |
|  |  | Q1: [=========================] 75                     |  |  |
|  |  | Q2: [=========================] 80                     |  |  |
|  |  | Q3: [=========================] 90                     |  |  |
|  |  └─────────────────────────────────────────────────────────┘  |  |
|  |  (Repeat for each nominee)                                   |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  Submit Validation:                                                |
|  - ALL nominees MUST be scored                                   |
|  - ALL questions MUST be answered                                |
|  - Cannot vote for self (checked)                                |
|       +                                                             |
|  RPC: submit_penilaian_mode_1a(p_token, p_payload_json)           |
|       +                                                             |
|  Success: Show success screen, mark token as used                |
+------------------------------------------------------------------+
```

---

## MODE_1B Flow (Quick Vote)

### Flat Mode (tanpa kategori)

```
+------------------------------------------------------------------+
|                     MODE_1B FLAT VOTING                           |
+------------------------------------------------------------------+
|  /penilai/{token_uuid}                                             |
|       +                                                             |
|  Fetch: Daftar nominees                                            |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Grid Display:                                                 |  |
|  |  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            |  |
|  |  │  Avatar │ │  Avatar │ │  Avatar │ │  Avatar │            |  |
|  |  │  Budi   │ │  Ahmad  │ │  Siti   │ │  Rina   │            |  |
|  |  │   [ ]   │ │   [ ]   │ │   [ ]   │ │   [ ]   │            |  |
|  |  └─────────┘ └─────────┘ └─────────┘ └─────────┘            |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  User selects ONE nominee → Submit button enabled                  |
|       +                                                             |
|  RPC: submit_quick_vote_mode_1b(p_token, p_nominee_id)            |
+------------------------------------------------------------------+
```

### Hybrid Mode (MODE_1C - dengan kategori)

```
+------------------------------------------------------------------+
|                     MODE_1C HYBRID VOTING                         |
+------------------------------------------------------------------+
|  /penilai/{token_uuid}                                             |
|       +                                                             |
|  Fetch: Daftar nominees + Voting categories                        |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Category Tabs:                                                |  |
|  |  [Inovasi] [Kerja Sama] [Kepemimpinan]                       |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  For each category:                                               |
|  +---------------------------------------------------------------+  |
|  |  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            |  |
|  |  │  Avatar │ │  Avatar │ │  Avatar │ │  Avatar │            |  |
|  |  │  Budi   │ │  Ahmad  │ │  Siti   │ │  Rina   │            |  |
|  |  │   [ ]   │ │   [ ]   │ │   [ ]   │ │   [ ]   │            |  |
|  |  └─────────┘ └─────────┘ └─────────┘ └─────────┘            |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  Validation: User MUST vote in ALL categories before submit       |
|       +                                                             |
|  RPC: submit_all_votes_mode_1c(p_token, p_votes_json)             |
+------------------------------------------------------------------+
```

---

## MODE_2 Flow (Juri Scoring)

```
+------------------------------------------------------------------+
|                     MODE_2 JURI SCORING FLOW                      |
+------------------------------------------------------------------+
|  /juri?token=550e8400-e29b-41d4-a716-446655440000                 |
|       +                                                             |
|  RPC: get_akses_juri_by_token(p_token)                            |
|       +                                                             |
|  Check: is_ketua_juri?                                            |
|       +                                                             |
|  Fetch: Daftar nominees + Kategori penilaian (with bobot_persen) |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Kategori Tabs (weighted):                                     |  |
|  |  [Inovasi 30%] [Kerja Sama 25%] [Kepemimpinan 45%]           |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  For each category:                                               |
|  +---------------------------------------------------------------+  |
|  |  ┌─────────────────────────────────────────────────────────┐  |  |
|  |  | [Avatar] Budi Santoso                                   │  |  |
|  |  |                                                         │  |  |
|  |  | Skor: [====|========] 75/100                           |  |  |
|  |  | Catatan: [________________________________]             |  |  |
|  |  └─────────────────────────────────────────────────────────┘  |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  Validation:                                                       |
|  - ALL categories MUST be scored                                  |
|  - Bobot MUST total 100% (checked server-side)                   |
|       +                                                             |
|  RPC: submit_penilaian_mode_2(p_token, p_payload_json)            |
+------------------------------------------------------------------+
```

### Ketua Juri View

RekapKetuaJuri component shows:
- Real-time tabulation across all juri
- Completion status (X of Y juri submitted)
- Weighted average per nominee
- Ranked results

---

## Nominee Flow

```
+------------------------------------------------------------------+
|                     NOMINEE UPLOAD FLOW                          |
+------------------------------------------------------------------+
|  /nominee?token=550e8400-e29b-41d4-a716-446655440000             |
|       +                                                             |
|  RPC: get_akses_nominee_by_token(p_token)                         |
|       +                                                             |
|  Check: is_digunakan? (already submitted?)                       |
|       +                                                             |
|  Fetch: Pertanyaan/narasi templates for this mode                |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Forms based on mode:                                         |  |
|  |                                                               |  |
|  |  MODE_1A: Narasi answers only                                |  |
|  |  ┌─────────────────────────────────────────────────────────┐  |  |
|  |  | Q1: Deskripsikan inovasi Anda...                        │  |  |
|  |  | [________________________________________________]      │  |  |
|  |  └─────────────────────────────────────────────────────────┘  |  |
|  |                                                               |  |
|  |  MODE_1B: Document uploads (bukti)                           |  |
|  |  ┌─────────────────────────────────────────────────────────┐  |  |
|  |  | Upload Bukti: [Pilih File]                              │  |  |
|  |  | Max: 10MB (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX)       │  |  |
|  |  └─────────────────────────────────────────────────────────┘  |  |
|  |                                                               |  |
|  |  MODE_2: Multiple upload types                               |  |
|  |  - Video Profil (opsional)                                  |  |
|  |  - Portofolio (opsional)                                    |  |
|  |  - Dokumen Bukti (wajib)                                    |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  RPC: submitJawabanNominee() / uploadBuktiPDF()                   |
+------------------------------------------------------------------+
```

---

## Admin Period Creation Wizard

```
Step 1: Info Dasar
+---------------------------------------------------------------+
| [Stepper: 1 - Info - 2 - Mode - 3 - Review]                  |
|                                                               |
| Nama Periode: [________________________]                       |
| Unit Kerja: [Select multiple units]                           |
| Tanggal Mulai: [datetime]                                     |
| Tanggal Selesai: [datetime]                                   |
| Petunjuk: [textarea]                                          |
|                                                               |
|                                    [Next ->]                  |
+---------------------------------------------------------------+

Step 2: Mode & Konten
+---------------------------------------------------------------+
| Mode Penilaian:                                               |
| [MODE_1A] [MODE_1B] [MODE_2] [MODE_2A]                       |
|                                                               |
| + MODE_1A: Pertanyaan Builder                                  |
| + MODE_1B: Voting Kategori Builder (opsional)                |
| + MODE_2: Pertanyaan + Kategori + Juri Penunjukan            |
| + MODE_2A: Kriteria Builder                                   |
|                                                               |
|                            [< Back] [Next ->]                  |
+---------------------------------------------------------------+

Step 3: Review & Submit
+---------------------------------------------------------------+
| Review configuration...                                        |
|                                                               |
|                            [< Back] [Buat Periode]             |
+---------------------------------------------------------------+
```

---

## Token Generation Flow

```
+------------------------------------------------------------------+
|                     TOKEN GENERATION FLOW                       |
+------------------------------------------------------------------+
|  Admin opens PartisipanPeriode                                   |
|       +                                                             |
|  Select: Generate tokens for whom?                              |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  | [ ] Semua Pegawai Aktif                                     |  |
|  | [x] Selected Pegawai (bulk)                                 |  |
|  | [ ] By Unit Kerja                                           |  |
|  └─────────────────────────────────────────────────────────────┘  |
|       +                                                             |
|  RPC: generate_token_penilaian_multi_unit(p_periode_id, p_wilayah) |
|       +                                                             |
|  Creates: akses_penilai records with UUID tokens                 |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Generated Tokens Table:                                     |  |
|  |  ┌─────────────────────────────────────────────────────────┐  |  |
|  |  | Nama | Unit | Token | Status | WA Sent                 │  |  |
|  |  ├─────────────────────────────────────────────────────────┤  |  |
|  |  | Budi | BPS Prov | abc123... | Available | -           │  |  |
|  |  | Ahmad| BPS Bangka| def456... | Available | ✓          │  |  |
|  |  └─────────────────────────────────────────────────────────┘  |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  Admin clicks: Kirim Notifikasi WA                                |
|       +                                                             |
|  kirimWaService.kirimNotifikasiBatch()                            |
+------------------------------------------------------------------+
```

---

## WhatsApp Notification Flow

```
+------------------------------------------------------------------+
|                    WHATSAPP FLOW                                  |
+------------------------------------------------------------------+
|  Admin creates period                                               |
|       +                                                             |
|  Generate tokens (penilai, juri, nominee)                            |
|       +                                                             |
|  Admin opens PartisipanPeriode                                      |
|       +                                                             |
|  Select template from /admin/kelola-template-wa                     |
|       +                                                             |
|  Click "Kirim Notifikasi"                                          |
|       +                                                             |
|  kirimWaService.kirimNotifikasiBatch()                            |
|       +                                                             |
|  ┌───────────────────────────────────────────────────────────────┐  |
|  │  kirimWaService.js (ANTI-BAN OPTIMAL):                        │  |
|  │                                                               │  |
|  │  1. Batch processing (max 2-5 per batch)                    │  |
|  │  2. Delay 3-8 detik antar pesan (normal)                     │  |
|  │  3. Occasional long pause (8% chance, 15-45 detik)           │  |
|  │  4. Jeda 45-120 detik antar batch (70% chance)              │  |
|  │  5. Template per kategori (NOMINEE/PENILAI/JURI)            │  │
|  │  6. Message variations (10% chance)                          │  │
|  └───────────────────────────────────────────────────────────────┘  |
|       +                                                             |
|  Log to log_notifikasi_wa                                           |
|       +                                                             |
|  Update notifikasi_wa_sent_at on token                              |
+------------------------------------------------------------------+
```

---

## Winner Lock Flow (DashboardKakan)

```
+------------------------------------------------------------------+
|                     WINNER LOCK FLOW                             |
+------------------------------------------------------------------+
|  Admin opens /admin/dashboard-kakan                               |
|       +                                                             |
|  View: Tabulasi mode based on period mode                         |
|       +                                                             |
|  Check: has Kakan access for this period?                        |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  Winner Selection:                                            |  |
|  |  ┌─────────────────────────────────────────────────────────┐  |  |
|  |  | Podium View:                                              │  |  |
|  |  │     [Rina]                                                │  |  |
|  |  │   [Budi]  [Ahmad]                                        │  |  |
|  |  │                                                         │  |  |
|  |  │ Select Winner: [Dropdown - Rina]                         │  |  |
|  |  │ Catatan: [____________________________]                   │  |  |
|  |  │                                                         │  |  |
|  |  │                              [Kuncikan Pemenang]       │  |  |
|  |  └─────────────────────────────────────────────────────────┘  |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  RPC: kuncikanPemenang(p_periode_id, p_pemenang_id, p_catatan)   |
|       +                                                             |
|  Creates: keputusan_kakan record (immutable)                      |
+------------------------------------------------------------------+
```

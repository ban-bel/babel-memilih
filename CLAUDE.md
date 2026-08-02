# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Sistem Penilaian Pegawai & Papan Juri** — "Babel Memilih"
A Jamstack employee performance evaluation and voting system built for Indonesian government (BPS - Badan Pusat Statistik).

**Live System**: https://babel-memilih.vercel.app/

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 (custom theme: navy, gold, paper colors) |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS, RPC) |
| Routing | React Router 7 |
| State | React Query 5 (singleton QueryClient in main.jsx) |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Forms | react-select |
| Deployment | Vercel |

---

## Quick Start

```bash
npm install           # Install dependencies
npm run dev          # Start development server (port 5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your Supabase credentials:
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
# VITE_FOONTE_TOKEN=your_fonnte_token_here  # For WhatsApp
```

---

## Architecture Overview

### Two Access Paths

The app has **distinct security models** that must be understood:

| Path | URL Pattern | Access Control |
|------|-------------|----------------|
| Admin | `/admin/*` | Supabase Auth login + role check (`role_admin !== 'USER_BIASA'`) |
| Penilai | `/penilai` | Verification via 5-digit NIP + 5-digit HP → then UUID token |
| Juri/Nominee | `/juri`, `/nominee` | UUID token in URL query string |

### Penilai Verification Flow (New - 2026-08)

```
+---------------------------------------------------------------------+
|                     PENILAI ACCESS FLOW (VERIFIKASI)                |
+---------------------------------------------------------------------+
|  User accesses /penilai (general link)                              |
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
+---------------------------------------------------------------------+
```

### Token Path Security (Juri & Nominee - unchanged)

```
+---------------------------------------------------------------------+
|                     TOKEN ACCESS FLOW (JURI/NOMINEE)                |
+---------------------------------------------------------------------+
|  User clicks link                                                   |
|       +                                                             |
|  /juri?token=550e8400-e29b-41d4-a716-446655440000                 |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  RPC: get_akses_juri_by_token(p_token) / get_akses_nominee... |  |
|  |  SECURITY DEFINER - bypasses RLS                             |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  Validates: Token exists + Period active + Not used                 |
|       +                                                             |
|  Returns: { akses, periode, juri/nominee } OR throws error         |
+---------------------------------------------------------------------+
```

### Three Assessment Modes

| Mode | Path | Scoring | Participants | Flow |
|------|------|---------|--------------|------|
| **MODE_1A** | `/penilai/{token}` | Numeric scores (1-100) per question | All employees (except nominees) | Nominee writes narasi + Penilai scores |
| **MODE_1B** | `/penilai/{token}` | Single favorite pick OR vote per category (if categories exist) | All employees (except nominees) | Nominee uploads bukti + Penilai votes |
| **MODE_2** | `/juri?token=xxx` | Weighted categories (must total 100%) | Selected jury members | Nominee uploads + Juri scores |

### MODE_1B - Quick Vote with Hybrid Categories

MODE_1B memiliki **dua sub-mode**:
- **Flat (tanpa kategori)**: Voter pilih 1 nominee langsung
- **Hybrid (dengan kategori)** = internally called **MODE_1C**: Voter wajib vote di SEMUA kategori

**Key Features:**
- **Flat Mode (tanpa kategori):** Pilih 1 nominee favorit langsung
- **Hybrid Mode (dengan kategori):** Admin membuat 1-5+ kategori voting
- User WAJIB vote di SEMUA kategori sebelum submit
- Vote counts per category, ranked by total votes
- Support for resume/edit existing votes

**Internal Implementation:**
- Table: `suara_kategori_vote`
- RPC: `submit_vote_mode_1c`, `submit_votes_mode_1c`
- View: `view_tabulasi_mode_1c`

### Period Lifecycle

```
DRAFT --> BERJALAN --> SELESAI --> DIARSIPKAN
   +          +            +
Configure  Evaluate    Lock Winner
```

---

## URL Routes

| Route | Component | Access | Purpose |
|-------|-----------|--------|---------|
| `/` | PortalLandingPage | Public | Home page with entry buttons |
| `/penilai` | VerifikasiPenilai | Public (NIP+HP verification) | Identity verification page |
| `/penilai/:token` | PenilaiPage | UUID token (MODE_1A/1B) | Evaluator voting page |
| `/juri?token=xxx` | JuriPage | Token (MODE_2) | Judge scoring page |
| `/nominee?token=xxx` | NomineePage | Token | Nominee narration/upload |
| `/admin` | AdminDashboard | Authenticated | Main admin dashboard |
| `/admin/kelola-periode` | KelolaPeriode | Authenticated | Period management with wizard |
| `/admin/kelola-wilayah` | KelolaWilayah | Authenticated | Region management |
| `/admin/kelola-pegawai` | KelolaPegawai | Authenticated | Employee management (includes HP input) |
| `/admin/kelola-template-wa` | KelolaTemplateWA | Authenticated | WhatsApp template management |
| `/admin/perkenalan-wa` | PerkenalanNomorWA | Authenticated | WhatsApp number introduction |
| `/admin/dashboard-kakan` | DashboardKakan | Authenticated | Kakan-only winner dashboard |
| `/admin/reset-token` | ResetToken | Authenticated | Token reset utility (with WA reset option) |

---

## Project Structure

```
web-git/                   # Frontend React (Vercel deploys this)
+-- src/                   # React application
+-- supabase/             # Database scripts
+-- dist/                  # Production build
+-- CLAUDE.md              # This file
+-- package.json
+-- vite.config.js
+-- tailwind.config.js

wabot-lokal/               # WhatsApp Bot (LOCAL ONLY - sibling folder)
+-- index.js               # Main bot + Express web server
+-- package.json
+-- .env                   # Supabase credentials (local only)
+-- public/
|   +-- index.html         # Web Dashboard UI
+-- services/
|   +-- supabaseClient.js  # Database connection
|   +-- database.js        # CRUD pegawai
|   +-- whatsappService.js # Baileys WhatsApp connection
|   +-- apiService.js      # Template & send message
|   +-- antiBanHelper.js   # Anti-ban utilities
|   +-- pesanService.js    # Message formatting
+-- sessions/              # WhatsApp auth (auto-generated)
+-- README.md              # Dokumentasi lengkap
+-- bot.log                # Log file
```

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `wilayah` | Hierarchical regions (PROVINSI + KABKOTA) | id, nama_wilayah, level, parent_id, nama_unit_kerja |
| `pegawai` | Employee master data | id, nama, nip/nip_baru, email, no_hp, role_admin, is_kakan, foto_url, is_active, golongan, jabatan |
| `periode_penilaian` | Assessment periods | id, nama_periode, mode_penilaian, status, tgl_mulai, tgl_selesai, petunjuk_penilaian, jumlah_kandidat_kakan |
| `periode_unit_kerja` | Multi-unit linkage | periode_id, wilayah_id |
| `pertanyaan` | Mode 1A questions | id, periode_id, urutan, teks_pertanyaan, skor_min, skor_max |
| `kategori_penilaian` | Mode 2 categories | id, periode_id, nama_kategori, bobot_persen, skor_min, skor_max |
| `voting_kategori` | Mode 1B voting categories | id, periode_id, nama_kategori, deskripsi, urutan |
| `nominee_periode` | Nominees per period | id, periode_id, pegawai_id |
| `jawaban_nominee` | Nominee answers + files | id, nominee_id, pertanyaan_id, teks_jawaban, file_url |
| `akses_penilai` | Evaluator tokens (UUID) | id, token_akses, is_digunakan, notifikasi_wa_sent_at, submitted_at |
| `akses_nominee` | Nominee upload tokens | id, token_akses, is_digunakan, notifikasi_wa_sent_at, submitted_at |
| `juri_periode` | Jury tokens | id, token_akses, is_ketua_juri, is_digunakan, notifikasi_wa_sent_at, submitted_at |
| `penilaian_skor` | Mode 1A scores | id, penilai_id, nominee_id, pertanyaan_id, skor |
| `suara_quick_vote` | Mode 1B flat votes | id, penilai_id, nominee_pilihan_id |
| `suara_kategori_vote` | Mode 1B hybrid votes | id, voter_id, nominee_id, kategori_id, periode_id |
| `penilaian_juri` | Mode 2 jury scores | id, juri_id, nominee_id, kategori_id, skor, catatan_juri |
| `keputusan_kakan` | Winner lock | id, periode_id, kakan_id, pemenang_id, catatan_pertimbangan |
| `log_aktivitas` | Audit trail | id, aksi, detail, user_id |
| `template_pesan_wa` | WA message templates | id, nama_tampilan, isi_pesan, is_active |
| `log_notifikasi_wa` | WA sending logs | id, template_id, nomor_hp, status, error_message, sent_at |

### Enums

```sql
user_role_enum:     'SUPER_ADMIN' | 'ADMIN_PROVINSI' | 'ADMIN_KABKOTA' | 'USER_BIASA'
mode_penilaian_enum: 'MODE_1A' | 'MODE_1B' | 'MODE_2'
status_periode_enum: 'DRAFT' | 'BERJALAN' | 'SELESAI' | 'DIARSIPKAN'
```

### Key Views (Real-time Tabulation)

| View | Mode | Calculation |
|------|------|-------------|
| `view_tabulasi_mode_1a` | MODE_1A | AVG of normalized scores (0-100%), ranked by score + participation |
| `view_tabulasi_mode_1b` | MODE_1B | COUNT of votes (flat + per kategori), ranked by count |
| `view_tabulasi_mode_2` | MODE_2 | Weighted AVG across categories, shows completion status |

### Key RPC Functions

```sql
-- Token fetching (SECURITY DEFINER - critical for security)
get_akses_penilai_by_token(p_token UUID)     + JSONB
get_akses_juri_by_token(p_token UUID)         + JSONB
get_akses_nominee_by_token(p_token UUID)     + JSONB

-- Submission (atomic with anti-self-vote)
submit_penilaian_mode_1a(p_token, p_payload_json)
submit_quick_vote_mode_1b(p_token, p_nominee_id)
submit_all_votes_mode_1c(p_token, p_votes_json)
submit_penilaian_mode_2(p_token, p_payload_json)

-- Token management
tandai_akses_penilai_terpakai(p_token)
tandai_akses_juri_terpakai(p_token)
tandai_akses_nominee_terpakai(p_token)
reset_akses_penilai_universal(p_periode_id, p_pegawai_id, p_admin_id)
generate_token_penilaian_multi_unit(p_periode_id, p_wilayah_ids)

-- Validation
check_total_bobot_kategori(p_periode_id)
get_jumlah_juri_periode(p_periode_id)
```

---

## Security-Critical Patterns

### 1. Token Fetching - ALWAYS via RPC

```javascript
// CORRECT - Uses RPC SECURITY DEFINER
const { data } = await supabase.rpc('get_akses_penilai_by_token', { p_token: token });

// WRONG - Exposes tokens via permissive RLS
const { data } = await supabase.from('akses_penilai').select().eq('token_akses', token);
```

**Why?** Token tables have `FOR ALL USING (true)` RLS policies. Direct queries bypass intended protection. RPC functions with `SECURITY DEFINER` run with elevated privileges and implement business logic.

### 2. Self-Vote Prevention

Checked at TWO levels:

**Client (votingService.js):**
```javascript
if (daftarSkor.some(item => item.nominee_id === penilaiId)) {
  throw new Error('Tidak diperbolehkan menilai diri sendiri');
}
```

**Server (RPC `submit_penilaian_mode_1a`):**
```sql
CONSTRAINT anti_self_vote_1a CHECK (penilai_id <> nominee_id)
```

### 3. Mandatory All-Nominee Scoring

Mode 1A requires every penilai to score EVERY nominee on EVERY question:
```javascript
// Client validates all nominees scored
if (belumDinilai.length > 0) {
  throw new Error(`Wajib menilai SEMUA nominee! Yang belum dinilai: ${...}`);
}
```

### 4. Storage Security

- Bucket: `dokumen-bukti` (private)
- Files accessed via signed URLs (1-hour expiry)
- Path format: `{periodeId}/{nomineeId}/{pertanyaanId}-{timestamp}.{ext}`

---

## Key Patterns & Conventions

### Service Layer Separation

```javascript
// votingService.js - PUBLIC token-based (no auth)
export async function fetchTokenPenilai(token) { ... }
export async function submitPenilaianMode1A(...) { ... }

// adminService.js - AUTHENTICATED admin operations
export async function fetchSesiAdmin() { ... }
export async function buatPeriodePenilaian(...) { ... }
```

### React Query Patterns

```javascript
// Singleton QueryClient (main.jsx)
export const queryClient = new QueryClient();

// Queries with conditional execution
const { data } = useQuery({
  queryKey: ['key', id],
  queryFn: fetchFn,
  enabled: Boolean(id)  // Prevents execution until ready
});

// Mutations with optimistic updates
const mutation = useMutation({
  mutationFn: (data) => apiCall(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
  onError: (err) => toast.error(err.message)
});
```

### Admin Auth Pattern

```javascript
// AdminLoginGate wraps protected content
export default function KelolaPeriode() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <KelolaPeriodeContent />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}
```

### Avatar Fallback Chain

```javascript
// Priority: foto_url > GitHub by NIP (lama) > ui-avatars.com
export function getPegawaiAvatarUrl(pegawai) {
  if (pegawai?.foto_url) return pegawai.foto_url;
  const nip = pegawai?.nip;
  if (nip) return `${GITHUB_AVATAR_BASE_URL}/${nip}.jpg`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=0F172A&color=fff`;
}
```

### Sapaan Logic (from NIP)

Determined by age (from birth date in NIP) and gender (digit 15):

| Age | Digit 15 = 1 (Male) | Digit 15 = 2 (Female) |
|-----|---------------------|----------------------|
| < 28 years | (name only) | (name only) |
| 28-34 years | `Bang [Name]` | `Kak [Name]` |
| >= 35 years | `Bapak [Name]` | `Ibu [Name]` |

### Upper Rank Classification

Used in DashboardKakan for filtering. Upper Rank includes:
- Struktural Eselon 3: Kepala BPS Provinsi, Kepala BPS Kabupaten/Kota, Kepala Bagian Umum
- Fungsional Ahli Madya

```javascript
// Check if a position is Upper Rank
isUpperRank('Statistisi Ahli Madya BPS Kabupaten/Kota') // => true
isUpperRank('Staf BPS Provinsi') // => false
```

---

## WhatsApp Notification System

### Architecture

```
+---------------------------------------------------------------------+
|                    WHATSAPP FLOW                                    |
+---------------------------------------------------------------------+
|  Admin creates period                                               |
|       +                                                             |
|  Generate tokens (penilai, juri, nominee)                            |
|       +                                                             |
|  Admin opens PartisipanPeriode                                      |
|       +                                                             |
|  Select template from /admin/kelola-template-wa                     |
|       +                                                             |
|  Click "Kirim Notifikasi"                                           |
|       +                                                             |
|  +---------------------------------------------------------------+  |
|  |  kirimWaService.js (ANTI-BAN OPTIMAL):                       |  |
|  |                                                               |  |
|  |  1. Batch processing (max 25 per batch)                      |  |
|  |  2. Delay 15-25 detik antar pesan                           |  |
|  |  3. Occasional long pause (5% chance, 30-60 detik)          |  |
|  |  4. Jeda 60 detik antar batch                              |  |
|  |  5. Template per kategori (NOMINEE/PENILAI/JURI)            |  |
|  +---------------------------------------------------------------+  |
|       +                                                             |
|  Log to log_notifikasi_wa                                           |
|       +                                                             |
|  Update notifikasi_wa_sent_at on token                              |
+---------------------------------------------------------------------+
```

### WhatsApp Number Introduction (/admin/perkenalan-wa)

A dedicated page for introducing a new WhatsApp number to employees:

- **Fonnte API**: Fast sending directly from server
- **Wa.Me Integration**: Send via WhatsApp Web (safer - location match)
- **Bulk sending** with human-like delays
- **Message variations** to avoid spam detection

### Fonnte API

**Endpoint**: `https://api.fonnte.com/send`

**Authentication**:
```javascript
Authorization: YOUR_FOONTE_TOKEN
```

**Single Message**:
```javascript
POST https://api.fonnte.com/send
Body: {
  target: '628123456789',
  message: 'Isi pesan',
  delay: '2'  // Delay dalam detik (1-10)
}
```

**Bulk Message (Recommended)**:
```javascript
POST https://api.fonnte.com/send
Body: {
  data: JSON.stringify([
    { target: '628123456789', message: 'Pesan 1', delay: '2' },
    { target: '628987654321', message: 'Pesan 2', delay: '3' }
  ])
}
```

**Dynamic Message**:
```javascript
// Target format: "628xxx|name|var1|var2"
{ target: '628123456789|Budi|Admin', message: 'Hai {name}, kamu adalah {var1}' }
```

### Human-Like Anti-Ban Settings

Sistem menggunakan multiple patterns untuk membuat pengiriman terlihat seperti manusia:

#### Delay Patterns (Variable)

| Pattern | Chance | Delay | Analogi Manusia |
|---------|--------|-------|----------------|
| Short pause | 15% | 1-3 detik | "Keburu" |
| Normal delay | 70% | 4-10 detik | Typing normal |
| Long pause | 10% | 15-30 detik | "Terganggu" |
| Very long pause | 5% | 45-90 detik | "Ke toilet/meeting" |

#### Contextual Delays

- **Weekend**: Delay 1.5x lebih lama
- **Lunch (12-13)**: Delay 1.3x lebih lama
- **Morning (8-9)**: Delay 0.8x lebih cepat
- **Evening (17-18)**: Delay 1.4x lebih lama

#### Fonnte API Settings

| Parameter | Nilai | Keterangan |
|-----------|-------|------------|
| Typing indicator | 30% chance | Simulasi "sedang mengetik" |
| Country code skip | 5% chance | Error input manusia |
| Delay per pesan | 1-10 detik | Fonnte max |

### Template Placeholders

| Placeholder | Diganti Dengan | Required |
|-------------|---------------|----------|
| `[NAMA]` | Nama lengkap recipient | No |
| `[PANGGILAN]` | Sapaan (Bapak/Ibu/Bang/Kak) | No |
| `[LINK]` | Full token URL | REQUIRED |
| `[PERAN]` | Nominee / Penilai / Juri | No |
| `[NAMA_PERIODE]` | Nama periode penilaian | No |
| `[TANGGAL_MULAI]` | Tanggal mulai (format Indonesia) | No |
| `[TANGGAL_SELESAI]` | Tanggal selesai (format Indonesia) | No |

### Template Per Kategori (Best Practice)

Sistem otomatis memilih template berdasarkan kategori. Buat template berbeda untuk tiap peran:

**Template untuk Nominee:**
```
Assalamualaikum [PANGGILAN] [NAMA],

Anda ditunjuk sebagai NOMINEE dalam:
[emoji] [NAMA_PERIODE]

[emoji] Tugas: Tulis narasi prestasi/inovasi Anda

[emoji] [LINK]

Batas: [TANGGAL_SELESAI]
```

---

## WhatsApp Bot Lokal (wabot-lokal)

WhatsApp Bot menggunakan library [Baileys](https://github.com/WhiskeySockets/Baileys) untuk mengirim pesan dari HP kamu sendiri. **Lokasi: `wabot-lokal/`** (sibling folder, TIDAK di-deploy ke server).

### Kenapa Pakai Bot Lokal?

| Metode | Kelebihan | Kekurangan |
|--------|----------|------------|
| **Fonnte API** | Cepat, otomatis | Risiko banned (location mismatch) |
| **Baileys (wabot-lokal)** | Aman, tidak banned | Harus online, perlu scan QR |

### Arsitektur

```
HP (WhatsApp)  <--->  WhatsApp Web Protocol  <--->  wabot-lokal (localhost:3000)
                                                |
                                                +-- Web Dashboard UI
                                                +-- Baileys Connection
                                                +-- Supabase Database
```

### Menjalankan Bot

```bash
# Masuk ke folder bot (sibling of web-git)
cd ../wabot-lokal

# Install dependencies (jika belum)
npm install

# Jalankan
npm run dev

# Output:
# 1. QR Code di terminal - scan dengan WhatsApp
# 2. Web Dashboard di http://localhost:3000
```

### Fitur Web Dashboard (wabot-lokal)

| Tab | Fungsi |
|-----|--------|
| **Periode** | Lihat token counts per periode |
| **Pegawai** | CRUD data pegawai |
| **Template** | Edit template pesan WA |
| **Kirim** | Kirim notifikasi bulk |

### Struktur Folder (wabot-lokal)

```
wabot-lokal/
+-- index.js              # Main bot + web server (Express)
+-- package.json
+-- .env                  # Environment (local only, gitignored)
+-- .env.example          # Template
+-- public/
|   +-- index.html        # Web Dashboard UI
+-- services/
|   +-- supabaseClient.js  # Koneksi database
|   +-- database.js        # CRUD pegawai
|   +-- whatsappService.js # WhatsApp connection (Baileys)
|   +-- apiService.js      # Template & kirim pesan
|   +-- antiBanHelper.js   # Helper anti-ban
|   +-- pesanService.js    # Message formatting
+-- sessions/             # WhatsApp auth (auto-generated, gitignored)
+-- README.md             # Dokumentasi lengkap
+-- bot.log               # Log file
```

### Catatan Penting

- **Session persists** - Tidak perlu scan QR setiap kali
- **Lokal only** - Folder ini TIDAK di-deploy ke Vercel
- **Sibling folder** - Terpisah dari web-git, tapi share Supabase yang sama

---

## Admin Roles & Permissions

| Role | Scope | Capabilities |
|------|-------|--------------|
| `SUPER_ADMIN` | All regions | Full CRUD, all modes |
| `ADMIN_PROVINSI` | Province level | Full CRUD for province + kabkota |
| `ADMIN_KABKOTA` | Single kabkota | Limited to own kabkota only |
| `USER_BIASA` | None | Cannot access admin pages |

### Multi-Unit Work Assessment

| Admin Role | Single Unit | Multi-Unit |
|------------|-------------|------------|
| `ADMIN_KABKOTA` | Yes | No |
| `ADMIN_PROVINSI` | Yes | Yes |
| `SUPER_ADMIN` | Yes | Yes |

---

## Period Creation Wizard

The `/admin/kelola-periode` uses a 3-step wizard:

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
| [MODE_1A] [MODE_1B] [MODE_2]                                  |
|                                                               |
| + MODE_1A: Pertanyaan Builder                                  |
| + MODE_1B: Voting Kategori Builder (opsional)                 |
| + MODE_2: Pertanyaan + Kategori + Juri Penunjukan             |
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

## Tailwind Theme

### Custom Colors

```javascript
colors: {
  navy: { 50, 100, 300, 400, 500, 600, 700, 800, 900 },
  gold: { 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 },
  paper: '#faf9f5',
}
```

### Custom Shadows

`soft`, `soft-lg`, `soft-xl`, `card`, `card-hover`, `glow`, `glow-gold`

### Custom Animations

`fade-in`, `fade-in-up`, `fade-in-down`, `slide-in-right`, `slide-in-left`, `scale-in`, `bounce-in`, `pulse-soft`, `float`, `shimmer`, `wiggle`, `gradient`

---

## File Upload Specifications

- **Allowed types**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Max size**: 10MB per file
- **Storage bucket**: `dokumen-bukti` (private)
- **Access**: Signed URLs with 1-hour expiry

---

## GitIgnore Patterns

The following are intentionally ignored (contain PII/sensitive data):

```
supabase/*.sql      # Database files
supabase/*.dump     # Database dumps
supabase/*.csv      # Import/export data
.env                # Environment variables
```

---

## Recent Updates

| Date | Feature | Files |
|------|---------|-------|
| 2026-08 | **Verifikasi Identitas Penilai** - Input 5 digit NIP + 5 digit HP → tampilkan daftar periode → redirect ke form penilaian | `VerifikasiPenilai.jsx`, `votingService.js`, `00_deploy_master.sql` |
| 2026-07 | **MODE_1B Hybrid** - Voting per kategori (opsional) | `votingService.js`, `adminService.js`, `FormMode1C.jsx`, `FormVotingKategoriBuilder.jsx` |
| 2026-07 | **Perkenalan Nomor WA** - Introduction page for new WhatsApp number | `PerkenalanNomorWA.jsx`, `/admin/perkenalan-wa` route |
| 2026-07 | **Bulk nominee selection** with Select All checkbox | `KelolaNominee.jsx` |
| 2026-07 | WhatsApp notification system with anti-ban | `kirimWaService.js`, `fonnteService.js`, `templateWaService.js` |
| 2026-07 | Template WA CRUD | `KelolaTemplateWA.jsx` |
| 2026-07 | Sapaan logic by age/gender | `kirimWaService.js` |
| 2026-07 | HP input with duplicate warning | `KelolaPegawai.jsx` |
| 2026-07 | Reset token with WA reset | `ResetToken.jsx`, `votingService.js` |
| 2026-07 | Double confirmation modal | `ConfirmModal.jsx` |
| 2026-07 | Auto-save feedback (react-hot-toast) | All form components |
| 2026-07 | GitHub avatar fallback | `HeaderProfilAkses.jsx`, `constants.js` |
| 2026-07 | Multi-unit period support | `periode_unit_kerja`, `generate_token_penilaian_multi_unit` |
| 2026-07 | Dashboard Kakan dengan filter Upper Rank | `DashboardKakan.jsx`, `constants.js` |
| 2026-07 | Chairman Jury dengan real-time rekap | `RekapKetuaJuri.jsx`, `JuriPage.jsx` |
| 2026-07 | FormKunciPemenang - Winner lock form | `FormKunciPemenang.jsx` |

### Verifikasi Identitas Penilai (2026-08)

Fitur baru untuk akses penilai tanpa perlu link token UUID:

```
+---------------------------------------------------------------------+
|  /penilai (link umum)                                               |
|       +                                                             |
|  Input: 5 digit NIP + 5 digit HP                                  |
|       +                                                             |
|  Verifikasi → Tampilkan daftar periode:                             |
|  ┌─────────────────────────────────────────────────────────────┐   |
|  │ 📋 Penilaian Kerja Semester 2024           [Masuk →]       │   |
|  │    MODE_1A • Aktif sampai 31 Des 2024                     │   |
|  └─────────────────────────────────────────────────────────────┘   |
|  ┌─────────────────────────────────────────────────────────────┐   |
|  │ 📋 Evaluasi Kinerja Bulanan              [Masuk →]         │   |
|  │    MODE_1B • Aktif sampai 15 Jan 2025                     │   |
|  └─────────────────────────────────────────────────────────────┘   |
|       +                                                             |
|  Klik "Masuk" → Redirect ke /penilai/{token_uuid}                  |
+---------------------------------------------------------------------+
```

**Benefits:**
- Satu link umum untuk semua periode
- User tidak perlu Hafal/simpan UUID token
- Tetap aman karena verifikasi NIP + HP

### Bulk Nominee Feature

Di halaman `KelolaNominee`, admin dapat memilih beberapa pegawai sekaligus dengan checkbox:

```
+---------------------------------------------------------------------+
|  Bulk: Pilih Pegawai                                [Select All]     |
|  ================================================================== |
|  +---------------------------------------------------------------+  |
|  | [x] [Avatar] Budi Santoso                                    |  |
|  |          BPS Provinsi Babel                                  |  |
|  +---------------------------------------------------------------+  |
|  +---------------------------------------------------------------+  |
|  | [x] [Avatar] Ahmad Wijaya                                    |  |
|  |          BPS Kabupaten Bangka                                |  |
|  +---------------------------------------------------------------+  |
|  +---------------------------------------------------------------+  |
|  | [ ] [Avatar] Siti Rahayu                                     |  |
|  |          BPS Kabupaten Belitung                              |  |
|  +---------------------------------------------------------------+  |
|                                                                     |
|  +---------------------------------------------------------------+  |
|  |  [Avatar] Jadikan 2 Pegawai sebagai Nominee                  |  |
|  +---------------------------------------------------------------+  |
+---------------------------------------------------------------------+
```

- **Select All**: Toggle untuk memilih/membatalkan semua checkbox
- **Individual checkbox**: Pilih sebagian pegawai sesuai kebutuhan
- **Counter badge**: Menampilkan jumlah yang dipilih
- **Confirmation modal**: Double confirm sebelum bulk add
- **Auto-skip duplicate**: Pegawai yang sudah nominee akan dilewati

### Wa.Me Integration (PerkenalanNomorWA)

WhatsApp number introduction page offers two sending methods:

1. **Fonnte API** - Fast sending from server
2. **WhatsApp Web (Wa.Me)** - Safer (location match = no ban risk)

Features:
- Individual message sending via WhatsApp Web
- Bulk sending with anti-ban patterns
- Message preview
- Copy link functionality

---

## Supabase Setup Checklist

1. [ ] Create Supabase project
2. [ ] Run `supabase/00_deploy_master.sql` in SQL Editor
3. [ ] Create storage bucket `dokumen-bukti` (private)
4. [ ] Configure Row Level Security (policies in deploy script)
5. [ ] Create admin users in `pegawai` table with proper `role_admin`
6. [ ] Link `pegawai.user_id` to `auth.users`
7. [ ] Set environment variables in `.env`

---

## Troubleshooting

### Token not working?
1. Check `notifikasi_wa_sent_at` is null (already sent = already used)
2. Verify `is_digunakan` is false
3. Check period status is `BERJALAN`
4. Verify current date is between `tgl_mulai` and `tgl_selesai`

### "Token tidak ditemukan"
1. Verify RPC function exists: `SELECT get_akses_penilai_by_token('test-uuid')`
2. Check RLS policies allow anon role
3. Ensure SECURITY DEFINER is set on RPC functions

### Scores not appearing?
1. Check `view_tabulasi_mode_1a` is populated
2. Verify all nominees have at least one score
3. Check `penilaian_skor` table for data

### WhatsApp not sending?
1. Check `VITE_FOONTE_TOKEN` is set
2. Verify phone numbers have country code (62...)
3. Check `log_notifikasi_wa` for error messages

### "Akses ditolak" di halaman admin?
1. Verify user memiliki role_admin yang sesuai
2. ADMIN_KABKOTA hanya bisa akses wilayah sendiri
3. USER_BIASA tidak bisa akses admin sama sekali

---

## Keyboard Commands & Tips

- Gunakan `Ctrl+Shift+P` then "Claude: Clear Conversation" untuk reset session
- Untuk refactor besar, mulai dengan EnterPlanMode
- Gunakan agent untuk task paralel yang independen
- Batch file operations dengan parallel agent calls

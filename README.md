# Sistem Penilaian Pegawai & Papan Juri

Jamstack app: **React (Vite) + Tailwind CSS v3 + Supabase** (PostgreSQL, Auth, Storage, RLS, RPC).

## Menjalankan proyek

```bash
npm install
cp .env.example .env      # lalu isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
```

## Prasyarat di sisi Supabase

Jalankan perintah berikut di **SQL Editor Supabase**:

1. Buka file **`supabase/00_deploy_master.sql`**.
2. *Copy* seluruh isinya dan *Paste* di SQL Editor Supabase, lalu klik **Run**.
   *(File ini adalah gabungan lengkap dari skema tabel awal, fungsi RLS, Tabulasi, RPC Mode, Keamanan Zero-Trust, hingga fungsi Reset Token. Menjalankan file ini menggantikan keharusan untuk menjalankan 7 file SQL terpisah).*
3. Buat bucket Storage **privat** bernama `dokumen-bukti` (Dashboard →
   Storage → New bucket) untuk upload dokumen bukti PDF nominee.
4. Admin pertama harus dibuat manual: buat user di Supabase Auth, lalu insert
   baris `pegawai` dengan `user_id` mengarah ke user tsb dan `role_admin` diisi
   selain `USER_BIASA`.

## Struktur proyek

```
sistem-penilaian-pegawai/
│
├── src/                    # React Frontend (deploy ke Vercel)
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
│
├── src-bot/                # WhatsApp Bot (Baileys - LOCAL SAJA)
│   ├── index.js            # Main bot
│   ├── services/
│   │   ├── supabaseClient.js
│   │   └── pesanService.js
│   ├── .env.example
│   └── README.md
│
├── supabase/               # Database migrations
└── ...
```

### Menjalankan WhatsApp Bot (Local)

```bash
cd src-bot
npm install
cp .env.example .env        # edit dengan credentials Supabase
npm run dev                 # scan QR dengan WhatsApp
```

> ⚠️ Folder `src-bot/` TIDAK di-deploy. Session WhatsApp dan .env hanya ada di komputer lokal kamu.

## Progres

- [x] **STEP 1** — Struktur proyek, `supabaseClient.js`, `votingService.js`
- [x] **STEP 2** — `PenilaiPage.jsx` (`/penilai?token=xxx`, Mode 1A & 1B)
- [x] **STEP 3** — `JuriPage.jsx` (`/juri?token=xxx`, Mode 2 + Tab Ketua Juri)
- [x] **STEP 4** — `BuatPeriode.jsx` (Admin, Form Wizard periode baru)
- [x] **Tambahan** — `NomineePage.jsx`, `KelolaNominee.jsx`, `DashboardKakan.jsx`, `ResetToken.jsx`

Belum ada (di luar semua permintaan sejauh ini): export Excel/CSV daftar token,
live-progress partisipasi real-time di dashboard Admin, dan halaman audit log
(`log_aktivitas`) — tabelnya sudah ada & diisi otomatis oleh
`reset_akses_penilai_universal`, tapi belum ada UI untuk membacanya.

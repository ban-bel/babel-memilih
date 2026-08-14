# Babel Memilih: Sistem Penilaian Pegawai & Papan Juri Terintegrasi 🏆

**Babel Memilih** adalah platform *Jamstack* modern berskala enterprise yang dirancang khusus untuk mengelola asesmen kinerja, pemilihan pegawai teladan, dan penjurian kompetisi di lingkungan pemerintahan (khususnya Badan Pusat Statistik).

Sistem ini memadukan antarmuka *Gen-Z friendly*, arsitektur *Zero-Trust Security*, serta sistem pengiriman notifikasi terotomatisasi via WhatsApp.

---

## 🚀 Fitur Unggulan

### 1. Multi-Mode Penilaian (*Assessment Modes*)
Aplikasi ini mendukung 4 mode penilaian dinamis yang dapat dikonfigurasi per-periode:
- **Mode 1A (Penilaian 360°):** Penilaian kuantitatif (1-100) terhadap seluruh kandidat dengan sistem paksaan (wajib menilai semua) dan pencegahan *self-voting*.
- **Mode 1B (Quick Vote):** Sistem *one-click vote* untuk memilih pegawai terfavorit secara langsung.
- **Mode 1C (Hybrid Kategori):** Variasi dari Mode 1B di mana pemilih diwajibkan memberikan satu suara pada masing-masing kategori yang telah ditetapkan (misal: Ter-Inovatif, Ter-Ramah).
- **Mode 2 (Papan Juri Profesional):** Dikhususkan untuk dewan juri dengan matriks penilaian berbobot (total wajib 100%) dan pengisian catatan evaluasi.

### 2. Autentikasi Tanpa Sandi (*Passwordless* untuk Partisipan)
- **Verifikasi Penilai:** Tidak perlu akun! Penilai memverifikasi identitas menggunakan **5 digit terakhir NIP** dan **5 digit terakhir Nomor HP**.
- **Magic Link Token (Juri/Nominee):** Akses instan menggunakan Token UUID yang unik untuk setiap peran, langsung dikirim via WhatsApp.
- **DRAFT Lock & Keamanan Ekstra:** Tautan token tidak dapat digunakan sama sekali (dikunci otomatis) jika Admin belum meresmikan periode (masih berstatus `DRAFT`).

### 3. Distribusi WhatsApp Cerdas (Terintegrasi Fonnte)
- **Sistem Meta-Tag Konteks:** Admin dapat mengelompokkan template pesan (misal: `[PENILAI]`, `[NOMINEE]`). Sistem akan otomatis menyeleksi template yang sesuai saat mengirim notifikasi masal.
- **Anti-Banned Rate Limiting:** Pengiriman pesan massal menggunakan antrean jeda acak (11-18 detik) untuk menghindari pemblokiran nomor oleh WhatsApp.

### 4. Pelaporan Tingkat Lanjut (*Advanced Exporting*)
- **Tabulasi Real-time:** Dasbor Kakan (*Leaderboard*) memproses miliaran data suara secara langsung menggunakan PostgreSQL Views (`view_tabulasi_mode_1a`, dll).
- **Client-Side Export:** Data partisipan dapat diekspor langsung ke **CSV** atau **PDF** secara rapi dari browser Admin, lengkap dengan status pengerjaan (Sudah/Belum Submit).

### 5. UI/UX "Gen-Z" & Indikator Disiplin Otomatis
- Desain antarmuka memadukan warna *Navy*, *Gold*, dan *Emerald* yang solid dan interaktif.
- **Sistem Sapaan Dinamis:** Otomatis menyapa "Bang/Kak" atau "Bapak/Ibu" berdasarkan usia yang diekstrak dari NIP.
- **Peringatan Indisipliner (*Red Flag*):** Rekapitulasi Kehadiran secara otomatis menyorot sel keterlambatan atau KJK (Kekurangan Jam Kerja) menjadi merah tebal jika ada anomali.

---

## 🛠️ Tech Stack & Arsitektur

| Layer | Teknologi |
|-------|------------|
| **Frontend** | React 18, Vite 5, React Router 7 |
| **Styling** | Tailwind CSS v3 |
| **State/Cache** | React Query v5 |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, RLS, RPC) |
| **Integrasi WA** | Fonnte API |
| **Export Data** | jsPDF, jsPDF-AutoTable |
| **Ikon & Toast** | Lucide React, React Hot Toast |

---

## 💻 Menjalankan Proyek (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Siapkan Environment Variables
cp .env.example .env
# Isi variabel berikut di file .env:
# VITE_SUPABASE_URL=https://<your-project>.supabase.co
# VITE_SUPABASE_ANON_KEY=<your-anon-key>
# VITE_FONNTE_TOKEN=<your-fonnte-token>

# 3. Jalankan server lokal
npm run dev
```

---

## 🗄️ Prasyarat Database (Supabase Setup)

Jalankan perintah berikut di **SQL Editor Supabase**:

1. Buka file **`supabase/00_deploy_master.sql`**.
2. *Copy* seluruh isinya dan *Paste* di SQL Editor Supabase, lalu klik **Run**.
   *(File ini adalah gabungan lengkap dari skema tabel awal, fungsi RLS, Tabulasi, RPC Mode, Keamanan Zero-Trust, hingga fungsi Reset Token. Menjalankan file ini menggantikan keharusan untuk menjalankan 7 file SQL terpisah).*
3. Buat bucket Storage **privat** bernama `dokumen-bukti` untuk *upload* portofolio Nominee.
4. Buat Akun Admin Pertama: Buat user di menu *Supabase Auth*, lalu masukkan *record* ke tabel `pegawai` dengan `role_admin` diset sebagai `SUPER_ADMIN`.

> ⚠️ **Catatan Penting**: JANGAN memasukkan field `unit_kerja` secara manual (DML) ke tabel `pegawai` melalui aplikasi. Kolom tersebut adalah virtual/relasi dari `wilayah_id`.

---

## 📚 Dokumentasi Khusus AI / Developer

Proyek ini dilengkapi dengan panduan arsitektur mendalam untuk AI Agent atau pengembang yang akan melanjutkan (Handoff). Silakan merujuk pada:
1. `CLAUDE.md` (di root repository ini)
2. `agent_knowledge_base.md` (arsitektur lanjutan & trik teknis)

---
*Didesain dan dikembangkan untuk transparansi dan objektivitas penilaian ASN modern.*

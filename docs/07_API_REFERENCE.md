# API Reference

---

## Public APIs (Token-Based - votingService.js)

These endpoints use UUID tokens for access without authentication.

### Token Verification

#### verifikasiIdentitasPenilai(nip5digit, hp5digit)
Verifies penilai by 5-digit NIP and 5-digit HP.
```javascript
const result = await verifikasiIdentitasPenilai('12345', '67890');
// Returns: { pegawai: {...}, periode_list: [...] }
```

### Token Fetching

#### fetchTokenPenilai(token)
Fetches penilai access data by UUID token.
```javascript
const data = await fetchTokenPenilai('uuid-string');
// Returns: { akses, periode, penilai, nominees }
```

#### fetchTokenJuri(token)
Fetches jury access data by UUID token.
```javascript
const data = await fetchTokenJuri('uuid-string');
// Returns: { akses, periode, juri, nominees, categories }
```

#### fetchTokenNominee(token)
Fetches nominee access data by UUID token.
```javascript
const data = await fetchTokenNominee('uuid-string');
// Returns: { akses, nominee, periode, questions }
```

### Data Fetching

#### fetchDaftarNominee(periodeId)
Fetches all nominees for a period.
```javascript
const nominees = await fetchDaftarNominee('periode-uuid');
```

#### fetchPertanyaanMode1A(periodeId)
Fetches questions for Mode 1A assessment.
```javascript
const questions = await fetchPertanyaanMode1A('periode-uuid');
// Returns: [{ id, urutan, teks_pertanyaan, skor_min, skor_max }]
```

### Voting Submission

#### submitPenilaianMode1A(token, payload)
Submits Mode 1A scores.
```javascript
await submitPenilaianMode1A('token-uuid', {
  scores: [
    { nominee_id: 'uuid', pertanyaan_id: 'uuid', skor: 85 },
    // ... more scores
  ]
});
```

#### submitQuickVoteMode1B(token, nomineeId)
Submits single nominee vote (Mode 1B flat).
```javascript
await submitQuickVoteMode1B('token-uuid', 'nominee-uuid');
```

#### submitAllVotesMode1C(token, votes)
Submits votes per category (Mode 1C hybrid).
```javascript
await submitAllVotesMode1C('token-uuid', {
  votes: [
    { nominee_id: 'uuid', kategori_id: 'uuid' },
    { nominee_id: 'uuid', kategori_id: 'uuid2' },
  ]
});
```

#### submitPenilaianMode2(token, payload)
Submits Mode 2 jury scores.
```javascript
await submitPenilaianMode2('token-uuid', {
  scores: [
    { nominee_id: 'uuid', kategori_id: 'uuid', skor: 85, catatan: 'Bagus' },
  ]
});
```

### Nominee Submission

#### submitJawabanNominee(token, answers)
Submits narrative answers for Mode 1A nominees.
```javascript
await submitJawabanNominee('token-uuid', {
  answers: [
    { pertanyaan_id: 'uuid', teks_jawaban: 'Jawaban saya...' },
  ]
});
```

#### uploadBuktiPDF(token, file, pertanyaanId)
Uploads evidence file.
```javascript
await uploadBuktiPDF('token-uuid', fileObject, 'pertanyaan-uuid');
// File must be < 10MB, types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
```

### Reports

#### fetchRekapMode1A(periodeId)
Gets tabulation results for Mode 1A.
```javascript
const rekap = await fetchRekapMode1A('periode-uuid');
// Returns: [{ nominee, avg_skor, total_penilai, rank }]
```

#### fetchRekapMode1B(periodeId)
Gets tabulation results for Mode 1B.
```javascript
const rekap = await fetchRekapMode1B('periode-uuid');
// Returns: [{ nominee, vote_count, rank }]
```

#### fetchRekapMode2(periodeId)
Gets tabulation results for Mode 2.
```javascript
const rekap = await fetchRekapMode2('periode-uuid');
// Returns: [{ nominee, weighted_avg, completion, rank }]
```

---

## Admin APIs (adminService.js)

These endpoints require Supabase Auth session.

### Authentication

#### fetchSesiAdmin()
Gets current admin session.
```javascript
const session = await fetchSesiAdmin();
// Returns: { session, user, profile }
```

#### loginAdmin(email, password)
Logs in admin user.
```javascript
await loginAdmin('admin@example.com', 'password');
```

#### logoutAdmin()
Logs out current admin.
```javascript
await logoutAdmin();
```

### Period Management

#### fetchPeriodeList()
Gets all periods.
```javascript
const periods = await fetchPeriodeList();
```

#### buatPeriodePenilaian(data)
Creates new period.
```javascript
await buatPeriodePenilaian({
  nama_periode: 'Semester 1 2026',
  mode_penilaian: 'MODE_1A',
  tgl_mulai: '2026-01-01',
  tgl_selesai: '2026-06-30',
  petunjuk_penilaian: 'Petunjuk...',
  wilayah_ids: ['uuid1', 'uuid2'],
});
```

#### updateStatusPeriode(periodeId, status)
Updates period status.
```javascript
await updateStatusPeriode('periode-uuid', 'BERJALAN');
// Status: DRAFT, BERJALAN, SELESAI, DIARSIPKAN
```

### Pegawai Management

#### fetchDaftarPegawaiAktif()
Gets all active employees.
```javascript
const pegawais = await fetchDaftarPegawaiAktif();
```

#### tambahPegawai(data)
Adds new employee.
```javascript
await tambahPegawai({
  nama: 'Budi Santoso',
  nip: '199001012020001001',
  nip_baru: '199001012020001001',
  email: 'budi@bps.go.id',
  no_hp: '081234567890',
  role_admin: 'USER_BIASA',
  wilayah_id: 'province-uuid',
});
```

### Token Generation

#### generateTokenPenilaianMultiUnit(periodeId, wilayahIds)
Generates tokens for multi-unit period.
```javascript
await generateTokenPenilaianMultiUnit('periode-uuid', ['uuid1', 'uuid2']);
```

### Participant Management

#### fetchDaftarNomineeLengkap(periodeId)
Gets nominees with employee data.
```javascript
const nominees = await fetchDaftarNomineeLengkap('periode-uuid');
```

#### fetchDaftarPenilaiLengkap(periodeId)
Gets penilai tokens with employee data.
```javascript
const penilais = await fetchDaftarPenilaiLengkap('periode-uuid');
```

### Reset Operations

#### resetAksesPenilaiUniversal(periodeId, pegawaiId, adminId)
Resets penilai token for re-voting.
```javascript
await resetAksesPenilaiUniversal('periode-uuid', 'pegawai-uuid', 'admin-uuid');
```

### Winner Management

#### fetchKeputusanKakan(periodeId)
Gets winner decision for period.
```javascript
const keputusan = await fetchKeputusanKakan('periode-uuid');
```

#### kuncikanPemenang(periodeId, pemenangId, catatan, kakanId)
Locks winner decision.
```javascript
await kuncikanPemenang('periode-uuid', 'pemenang-uuid', 'Catatan...', 'kakan-uuid');
```

---

## WhatsApp APIs

### kirimWaService

#### kirimNotifikasiBatch(recipients, onProgress, options)
Sends batch WhatsApp notifications.
```javascript
await kirimNotifikasiBatch(
  [
    { token: 'uuid', kategori: 'PENILAI', nomor_hp: '628123456789', nama: 'Budi' },
  ],
  (progress) => console.log(`${progress.sent}/${progress.total}`),
  { templateId: 'template-uuid' }
);
```

### fonnteService

#### kirimPesanFonnte(target, message)
Sends single message via Fonnte API.
```javascript
await kirimPesanFonnte('628123456789', 'Pesan Anda');
```

#### kirimPesanBulkFonnte(messages)
Sends bulk messages via Fonnte API.
```javascript
await kirimPesanBulkFonnte([
  { target: '628123456789', message: 'Pesan 1' },
  { target: '628987654321', message: 'Pesan 2' },
]);
```

### templateWaService

#### fetchTemplateWaAktif()
Gets active templates.
```javascript
const templates = await fetchTemplateWaAktif();
```

#### tambahTemplateWa(data)
Creates new template.
```javascript
await tambahTemplateWa({
  nama_tampilan: 'Template Penilai',
  isi_pesan: 'Assalamualaikum [NAMA], silakan akses [LINK]',
  created_by: 'admin-uuid',
});
```

---

## RPC Functions Reference

These are called via `supabase.rpc('function_name', params)`.

### Security Definer Functions (Bypass RLS)

| Function | Purpose |
|----------|---------|
| `get_akses_penilai_by_token` | Validate penilai token |
| `get_akses_juri_by_token` | Validate jury token |
| `get_akses_nominee_by_token` | Validate nominee token |
| `verifikasi_identitas_penilai` | NIP + HP verification |
| `submit_penilaian_mode_1a` | Submit Mode 1A scores |
| `submit_quick_vote_mode_1b` | Submit Mode 1B vote |
| `submit_all_votes_mode_1c` | Submit Mode 1C votes |
| `submit_penilaian_mode_2` | Submit Mode 2 scores |
| `generate_token_penilaian_multi_unit` | Generate tokens |

### Regular Functions (RLS Applied)

| Function | Purpose |
|----------|---------|
| `fetch_periode_list` | Get periods |
| `fetch_pegawai_aktif` | Get active employees |
| `check_total_bobot_kategori` | Validate category weights |
| `get_jumlah_juri_periode` | Count juri per period |

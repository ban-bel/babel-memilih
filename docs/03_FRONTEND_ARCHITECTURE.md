# Frontend Architecture Documentation

---

## Directory Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   └── layout/          # Layout wrappers
├── config/              # Configuration files
│   └── supabaseClient.js
├── pages/
│   ├── admin/           # Admin pages (authenticated)
│   └── link-unik/       # Public token-based pages
├── services/            # API service layer
├── utils/               # Constants, helpers
├── App.jsx              # Router configuration
└── main.jsx             # Entry point
```

---

## Entry Point - main.jsx

```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 5 minutes
    },
  },
});
```

---

## Router Configuration - App.jsx

| Route | Component | Access |
|-------|-----------|--------|
| `/` | `PortalLandingPage` | Public |
| `/penilai` | `VerifikasiPenilai` | NIP+HP verification |
| `/penilai/:token` | `PenilaiPage` | UUID token |
| `/juri` | `JuriPage` | Token query param |
| `/nominee` | `NomineePage` | Token query param |
| `/admin` | `AdminDashboard` | Authenticated |
| `/admin/kelola-periode` | `KelolaPeriode` | Authenticated |
| `/admin/kelola-wilayah` | `KelolaWilayah` | Authenticated |
| `/admin/kelola-pegawai` | `KelolaPegawai` | Authenticated |
| `/admin/kelola-template-wa` | `KelolaTemplateWA` | Authenticated |
| `/admin/perkenalan-wa` | `PerkenalanNomorWA` | Authenticated |
| `/admin/dashboard-kakan` | `DashboardKakan` | Authenticated |
| `/admin/reset-token` | `ResetToken` | Authenticated |
| `/admin/kotak-keluar` | `KotakKeluar` | Authenticated |

---

## Service Layer

### adminService.js
All admin-side operations (requires authentication).

**Categories:**
- **Auth**: `fetchSesiAdmin()`, `loginAdmin()`, `logoutAdmin()`, `cariUidByEmail()`
- **Wilayah**: CRUD operations for regions
- **Pegawai**: CRUD operations for employees, bulk import
- **Periode**: Period management, status updates
- **Konfigurasi**: Questions (Mode 1A), Categories (Mode 2)
- **Token Generation**: `generateTokenPenilaianMultiUnit()`, `generateTokenPenilaianMassal()`
- **Partisipan**: `fetchDaftarNomineeLengkap()`, `fetchDaftarPenilaiLengkap()`, `fetchDaftarJuriLengkap()`
- **Voting Kategori**: Mode 1C category management
- **Reset**: `resetAksesPenilaiUniversal()`, `blockPenilai()`

### votingService.js
Public token-based voting operations (no login required).

**Categories:**
- **Token Fetching**: `fetchTokenPenilai()`, `fetchTokenJuri()`, `fetchTokenNominee()`
- **Verification**: `verifikasiIdentitasPenilai()` - validates NIP + HP
- **Data Reference**: `fetchDaftarNominee()`, `fetchPertanyaanMode1A()`, `fetchKategoriPenilaian()`
- **Submit Voting**: 
  - `submitPenilaianMode1A()` - Mode 1A
  - `submitQuickVoteMode1B()` - Mode 1B flat
  - `submitVoteMode1C()`, `submitAllVotesMode1C()` - Mode 1C hybrid
  - `submitPenilaianMode2()` - Mode 2
  - `submitPenilaianMode2A()` - Mode 2A
- **Nominee Forms**: 
  - `submitJawabanNominee()` - save narrative answers
  - `uploadBuktiPDF()`, `submitBuktiNomineeMode2()` - file uploads
  - `submitVideoProfilNominee()`, `submitPortofolioNominee()`
- **Rekap/Reports**: `fetchRekapMode1A()`, `fetchRekapMode1B()`, `fetchRekapMode2()`, etc.
- **File Access**: `getSignedUrlBuktiPDF()`
- **Draft**: `saveDraftToServer()`, `getDraftFromServer()`
- **Pemenang**: `fetchKeputusanKakan()`, `kuncikanPemenang()`

### kirimWaService.js
WhatsApp notification sending with human-like behavior.

**Key Functions:**
- `kirimNotifikasiBatch()` - main batch sending function
- `generatePesan()` - template message generation
- `hitungSapaan()` - calculates greeting (Bapak/Ibu/Bang/Kak) based on NIP
- `pilihTemplateByKategori()` - selects template by role

### fonnteService.js
Fonnte WhatsApp API integration.

**Key Functions:**
- `formatHP()` - converts 08xx to 62xx format
- `kirimPesanFonnte()` - single message send
- `kirimPesanBulkFonnte()` - bulk message send

### templateWaService.js
Template CRUD operations.

**Key Functions:**
- `fetchTemplateWaAktif()`, `fetchSemuaTemplateWa()`
- `tambahTemplateWa()`, `updateTemplateWa()`, `hapusTemplateWa()`

### wabotLokalService.js
Local WhatsApp bot integration.

**Key Function:**
- `kirimPesanLocalBot()` - sends via local bot API (localhost:3000)

---

## Common Components

| Component | Purpose |
|-----------|---------|
| `LoadingScreen.jsx` | Full-screen loading with animated logo |
| `WarningBox.jsx` | Warning/alert message box |
| `ConfirmModal.jsx` | Confirmation dialog for destructive actions |
| `SuccessScreen.jsx` | Success state screen |
| `ModalProgressKirim.jsx` | Progress modal for WA sending |
| `HeaderProfilAkses.jsx` | Header showing user access profile |
| `Modal.jsx` | Reusable modal dialog |
| `Pagination.jsx` | Pagination with page numbers |
| `StatusScreen.jsx` | Screen displaying access status |
| `FormKunciPemenang.jsx` | Form to lock winner decision |
| `Podium.jsx` | Podium display for winners |
| `ProfilNomineeModal.jsx` | Modal showing nominee profile |

---

## Admin Components

| Component | Purpose |
|-----------|---------|
| `AdminLayout.jsx` | Main layout with sidebar navigation |
| `AdminLoginGate.jsx` | Auth gate - shows login form if not logged in |
| `FormPertanyaanBuilder.jsx` | Questions builder for Mode 1A |
| `FormKategoriBuilder.jsx` | Category builder for Mode 2 |
| `FormKriteriaBuilder.jsx` | Criteria builder for Mode 2A |
| `FormVotingKategoriBuilder.jsx` | Voting categories for Mode 1C |
| `FormPenunjukanJuri.jsx` | Jury assignment form |
| `ModalEditProfilNominee.jsx` | Modal to edit nominee profile |
| `RekapDetailJuri.jsx` | Detailed jury evaluation recap |
| `KelolaJuriContent.jsx` | Jury management content |
| `KelolaKategoriContent.jsx` | Category management content |

---

## Public Components

| Component | Purpose |
|-----------|---------|
| `FormMode1A.jsx` | Mode 1A scoring form |
| `FormMode1C.jsx` | Mode 1C hybrid voting form |
| `FormMode2.jsx` | Mode 2 jury scoring form |
| `FormMode2A.jsx` | Mode 2A selection + scoring form |
| `FormNarasiNominee.jsx` | Narrative answer form |
| `FormBuktiTunggalNominee.jsx` | Single document upload |
| `FormVideoProfilNominee.jsx` | Video profile upload form |
| `FormPortofolioNominee.jsx` | Portfolio entry form |
| `GridMode1B.jsx` | Grid display for Mode 1B |
| `RekapKetuaJuri.jsx` | Chairman jury recap |

---

## Utilities - constants.js

### Enums
```javascript
MODE_PENILAIAN: { MODE_1A, MODE_1B, MODE_2, MODE_2A }
STATUS_PERIODE: { DRAFT, BERJALAN, SELESAI, DIARSIPKAN }
ROLE_ADMIN: { SUPER_ADMIN, ADMIN_PROVINSI, ADMIN_KABKOTA, USER_BIASA }
```

### Storage Constants
```javascript
STORAGE_BUCKET_BUKTI: 'dokumen-bukti'
MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024  // 10MB
ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
```

### Upper Rank Classification
```javascript
UPPER_RANK_PATTERNS: [
  /Statistisi.*Madya/i,
  /Kepala.*BPS/i,
  // ... more patterns
]

isUpperRank(jabatan)  // Returns boolean
```

### Avatar Helpers
```javascript
getPegawaiAvatarUrl(pegawai)
// Priority: foto_url > GitHub by NIP > ui-avatars.com
```

### Sapaan Logic
Based on NIP (birth date + gender):
| Age | Male | Female |
|-----|------|--------|
| < 28 | (name only) | (name only) |
| 28-34 | Bang | Kak |
| 35+ | Bapak | Ibu |

---

## Status Validator - statusValidator.js

```javascript
getStatusAksesToken(akses, periode)
// Returns: TOKEN_TIDAK_VALID | BELUM_DIBUKA | TELAH_DITUTUP | SUDAH_DIGUNAKAN | AKTIF

bolehMengisiForm(status, role)
// Returns boolean
```

---

## Key React Query Patterns

### Query with conditional execution
```javascript
const { data } = useQuery({
  queryKey: ['periode', id],
  queryFn: () => fetchPeriodeById(id),
  enabled: Boolean(id),  // Prevents execution until ready
});
```

### Mutation with optimistic updates
```javascript
const mutation = useMutation({
  mutationFn: (data) => submitPenilaian(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['periode'] });
    toast.success('Berhasil disimpan!');
  },
  onError: (err) => toast.error(err.message),
});

// Usage
mutation.mutate({ token, payload });
```

### Admin Auth Pattern
```javascript
<AdminLoginGate>
  {(adminProfile) => (
    <AdminLayout adminProfile={adminProfile}>
      <KelolaPeriode />
    </AdminLayout>
  )}
</AdminLoginGate>
```

---

## Supabase Client - supabaseClient.js

Two access patterns:
1. **Admin Path (Login Required)**: Uses Supabase Auth sessions
2. **Public Token Path (Zero-Trust)**: Uses token validation without login

```javascript
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
```

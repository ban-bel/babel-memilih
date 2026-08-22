# Sistem Penilaian Pegawai - BPS Provinsi Kepulauan Bangka Belitung

> **Babel Memilih** - Employee Performance Evaluation & Voting System

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
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev

# Production build to dist/
npm run build

# Preview production build
npm run preview
```

### Environment Setup

```bash
cp .env.example .env
```

Required environment variables:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FONNTE_TOKEN=your_fonnte_token_here
VITE_BOT_URL=http://localhost:3000  # Local bot (optional)
```

---

## Project Structure

```
web-git/
├── src/
│   ├── components/           # Shared UI components
│   │   ├── common/          # Reusable components
│   │   └── layout/          # Layout components
│   ├── config/              # Supabase configuration
│   ├── pages/
│   │   ├── admin/           # Admin pages (authenticated)
│   │   └── link-unik/       # Public token-based pages
│   ├── services/            # API service layer
│   ├── utils/               # Constants, helpers
│   ├── App.jsx             # Router configuration
│   └── main.jsx            # Entry point
├── supabase/               # Database scripts
├── dist/                   # Production build
└── package.json
```

---

## Three Access Paths

| Path | URL Pattern | Access Control |
|------|-------------|----------------|
| **Admin** | `/admin/*` | Supabase Auth login + role check (`role_admin !== 'USER_BIASA'`) |
| **Penilai** | `/penilai` | Verification via 5-digit NIP + 5-digit HP → then UUID token |
| **Juri/Nominee** | `/juri`, `/nominee` | UUID token in URL query string |

---

## Five Assessment Modes

| Mode | Path | Scoring | Participants |
|------|------|---------|--------------|
| **MODE_1A** | `/penilai/{token}` | Numeric scores (1-100) per question | All employees (except nominees) |
| **MODE_1B** | `/penilai/{token}` | Single favorite OR per category | All employees (except nominees) |
| **MODE_2** | `/juri?token=xxx` | Weighted categories (must total 100%) | Selected jury members |
| **MODE_2A** | `/penilai/{token}` | Criteria scoring | All employees |

### MODE_1B Sub-Modes

- **Flat (tanpa kategori)**: Voter pilih 1 nominee langsung
- **Hybrid (dengan kategori)**: Voter WAJIB vote di SEMUA kategori sebelum submit

---

## Key Patterns

### React Query (Server State)
```javascript
// Singleton QueryClient in main.jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

// Query with conditional execution
const { data } = useQuery({
  queryKey: ['key', id],
  queryFn: fetchFn,
  enabled: Boolean(id),  // Prevents execution until ready
});

// Mutation with optimistic updates
const mutation = useMutation({
  mutationFn: (data) => apiCall(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['key'] }),
  onError: (err) => toast.error(err.message),
});
```

### Admin Auth (Children as Function)
```javascript
<AdminLoginGate>
  {(adminProfile) => (
    <AdminLayout adminProfile={adminProfile}>
      <PageContent />
    </AdminLayout>
  )}
</AdminLoginGate>
```

### Service Layer Separation
- **votingService.js** - Public token-based operations (no auth)
- **adminService.js** - Authenticated admin operations
- **kirimWaService.js** - WhatsApp sending

---

## Important Security Rules

### 1. Token Fetching - ALWAYS via RPC

```javascript
// ✅ CORRECT - Uses RPC SECURITY DEFINER
const { data } = await supabase.rpc('get_akses_penilai_by_token', { p_token: token });

// ❌ WRONG - Exposes tokens via permissive RLS
const { data } = await supabase.from('akses_penilai').select().eq('token_akses', token);
```

### 2. Self-Vote Prevention

Checked at TWO levels:

**Client (votingService.js)**:
```javascript
if (daftarSkor.some(item => item.nominee_id === penilaiId)) {
  throw new Error('Tidak diperbolehkan menilai diri sendiri');
}
```

**Server (RPC)**:
```sql
CONSTRAINT anti_self_vote_1a CHECK (penilai_id <> nominee_id)
```

### 3. Mandatory All-Nominee Scoring

Mode 1A requires every penilai to score EVERY nominee on EVERY question.

---

## Period Lifecycle

```
DRAFT --> BERJALAN --> SELESAI --> DIARSIPKAN
   +          +            +
Configure  Evaluate    Lock Winner
```

---

## Admin Roles

| Role | Scope |
|------|-------|
| `SUPER_ADMIN` | All regions |
| `ADMIN_PROVINSI` | Province level |
| `ADMIN_KABKOTA` | Single kabkota |
| `USER_BIASA` | Cannot access admin |

---

## Tailwind Theme

Custom colors: `navy`, `gold`, `paper`
Custom shadows: `soft`, `soft-lg`, `card`, `glow`
Custom animations: `fade-in`, `slide-in-right`, `float`, `wiggle`

---

## File Upload

- **Allowed types**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Max size**: 10MB per file
- **Storage bucket**: `dokumen-bukti` (private)
- **Access**: Signed URLs with 1-hour expiry

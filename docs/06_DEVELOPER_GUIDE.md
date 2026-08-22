# Developer Guide

---

## Setting Up Development Environment

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account with project created

### 1. Clone and Install

```bash
cd web-git
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FONNTE_TOKEN=your_fonnte_token_here  # Optional for dev
VITE_BOT_URL=http://localhost:3000        # Optional for local bot
```

### 3. Database Setup

1. Create Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run `supabase/00_deploy_master.sql`
4. Create storage bucket `dokumen-bukti` (private)
5. Create admin users in `pegawai` table

### 4. Start Development

```bash
npm run dev
# Opens at http://localhost:5173
```

---

## Adding a New Assessment Mode

### 1. Database Layer

```sql
-- Add enum value (if new mode)
ALTER TYPE mode_penilaian_enum ADD VALUE 'MODE_X';

-- Create supporting tables
CREATE TABLE pertanyaan_mode_x (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_id UUID REFERENCES periode_penilaian,
  -- ... columns
);

-- Create scores table with anti-self-vote
CREATE TABLE penilaian_mode_x (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penilai_id UUID REFERENCES pegawai,
  nominee_id UUID REFERENCES pegawai,
  skor NUMERIC,
  CONSTRAINT anti_self_vote_mode_x CHECK (penilai_id <> nominee_id)
);

-- Create tabulation view
CREATE VIEW view_tabulasi_mode_x AS
SELECT ...;
```

### 2. RPC Functions

```sql
-- Token validation (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_akses_penilai_by_token_mode_x(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Validate token exists, period active, not used
-- Return { akses, periode, penilai, nominees }
$$;

-- Submission
CREATE OR REPLACE FUNCTION submit_penilaian_mode_x(p_token UUID, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Validate all nominees scored
-- Insert into penilaian_mode_x
-- Mark token as used
$$;
```

### 3. Service Layer (votingService.js)

```javascript
// Token fetching
export async function fetchTokenModeX(token) {
  const { data, error } = await supabase.rpc('get_akses_penilai_by_token_mode_x', { p_token: token });
  if (error) throw new Error(error.message);
  return data;
}

// Data fetching
export async function fetchPertanyaanModeX(periodeId) {
  const { data } = await supabase.from('pertanyaan_mode_x').select('*').eq('periode_id', periodeId);
  return data;
}

// Submission
export async function submitPenilaianModeX(token, payload) {
  const { error } = await supabase.rpc('submit_penilaian_mode_x', {
    p_token: token,
    p_payload_json: payload
  });
  if (error) throw new Error(error.message);
}
```

### 4. Component (FormModeX.jsx)

```javascript
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchTokenModeX, submitPenilaianModeX } from '../../services/votingService';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function FormModeX({ token }) {
  const { data: akses, isLoading } = useQuery({
    queryKey: ['akses-mode-x', token],
    queryFn: () => fetchTokenModeX(token),
    enabled: Boolean(token),
  });

  const mutation = useMutation({
    mutationFn: (payload) => submitPenilaianModeX(token, payload),
    onSuccess: () => toast.success('Berhasil disimpan!'),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return <LoadingScreen />;
  if (!akses) return <ErrorScreen message="Token tidak valid" />;

  return (
    <div className="space-y-6">
      {/* Form content */}
      <button onClick={() => mutation.mutate(payload)}>
        Submit
      </button>
    </div>
  );
}
```

### 5. Routing (App.jsx)

```javascript
import FormModeX from './pages/link-unik/components/FormModeX';

<Route path="/mode-x/:token" element={<FormModeXWrapper />} />
```

---

## Adding a New Admin Page

### 1. Create Component

```javascript
// src/pages/admin/KelolaFiturBaru.jsx
import AdminLoginGate from '../../components/common/AdminLoginGate';
import AdminLayout from './components/AdminLayout';

export default function KelolaFiturBaru() {
  return (
    <AdminLoginGate>
      {(adminProfile) => (
        <AdminLayout adminProfile={adminProfile}>
          <KelolaFiturBaruContent />
        </AdminLayout>
      )}
    </AdminLoginGate>
  );
}

function KelolaFiturBaruContent() {
  // Main content here
  return <div>Kelola Fitur Baru</div>;
}
```

### 2. Add Service Functions (adminService.js)

```javascript
export async function fetchFiturBaruData() {
  // ...
}

export async function createFiturBaru(data) {
  // ...
}
```

### 3. Add Route (App.jsx)

```javascript
import KelolaFiturBaru from './pages/admin/KelolaFiturBaru';

<Route path="/admin/kelola-fitur-baru" element={<KelolaFiturBaru />} />
```

### 4. Add Sidebar Navigation (AdminLayout.jsx)

```javascript
const menuItems = [
  // ... existing items
  {
    title: 'Fitur Baru',
    icon: <NewIcon />,
    path: '/admin/kelola-fitur-baru',
  },
];
```

---

## Adding a New WhatsApp Template Placeholder

### 1. Update Constants

```javascript
// src/services/kirimWaService.js
const WA_PLACEHOLDERS = {
  // ... existing
  NEW_PLACEHOLDER: '[NEW_PLACEHOLDER]',
};
```

### 2. Update Replacement Logic

```javascript
function generatePesan(templateText, replacements) {
  let pesan = templateText;
  
  // Existing replacements
  for (const [key, value] of Object.entries(replacements)) {
    pesan = pesan.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
    pesan = pesan.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  
  return pesan;
}
```

### 3. Update Usage in kirimNotifikasiBatch

```javascript
const replacements = {
  // ... existing
  NEW_PLACEHOLDER: data.newField,
};
```

---

## Testing Patterns

### Unit Test (Vitest)

```javascript
// src/utils/__tests__/statusValidator.test.js
import { describe, it, expect } from 'vitest';
import { getStatusAksesToken } from '../statusValidator';

describe('getStatusAksesToken', () => {
  it('returns SUDAH_DIGUNAKAN when token used', () => {
    const akses = { is_digunakan: true };
    const periode = { status: 'BERJALAN' };
    const result = getStatusAksesToken(akses, periode);
    expect(result).toBe('SUDAH_DIGUNAKAN');
  });
});
```

### Integration Test (React Testing Library)

```javascript
// src/pages/__tests__/VerifikasiPenilai.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifikasiPenilai from '../VerifikasiPenilai';

test('shows error when NIP not found', async () => {
  render(<VerifikasiPenilai />);
  
  fireEvent.change(screen.getByPlaceholderText('5 digit NIP'), {
    target: { value: '12345' }
  });
  fireEvent.change(screen.getByPlaceholderText('5 digit HP'), {
    target: { value: '67890' }
  });
  
  fireEvent.click(screen.getByText('Verifikasi'));
  
  await waitFor(() => {
    expect(screen.getByText('Data tidak ditemukan')).toBeInTheDocument();
  });
});
```

---

## Deployment

### Build

```bash
npm run build
# Output in dist/
```

### Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Environment Variables in Vercel

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_FONNTE_TOKEN=xxx
```

---

## Troubleshooting

### Token not working?

1. Check `notifikasi_wa_sent_at` is null (already sent = already used)
2. Verify `is_digunakan` is false
3. Check period status is `BERJALAN`
4. Verify current date is between `tgl_mulai` and `tgl_selesai`

### "Akses ditolak" di halaman admin?

1. Verify user has proper `role_admin`
2. ADMIN_KABKOTA only accesses own kabkota
3. USER_BIASA cannot access admin at all

### Scores not appearing?

1. Check `view_tabulasi_mode_1a` is populated
2. Verify all nominees have at least one score
3. Check `penilaian_skor` table for data

### WhatsApp not sending?

1. Check `VITE_FONNTE_TOKEN` is set
2. Verify phone numbers have country code (62...)
3. Check `log_notifikasi_wa` for error messages

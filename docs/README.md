# Babel Memilih - Knowledge Transfer

## Project Overview

**Sistem Penilaian Pegawai & Papan Juri** - "Babel Memilih"
A Jamstack employee performance evaluation and voting system for BPS (Badan Pusat Statistik) Provinsi Kepulauan Bangka Belitung.

**Live System**: https://babel-memilih.vercel.app/

---

## Documentation Index

| Doc | Contents |
|-----|----------|
| `01_PROJECT_OVERVIEW.md` | Tech stack, project structure, access paths, modes |
| `02_DATABASE_SCHEMA.md` | Tables, views, RPC functions, constraints |
| `03_FRONTEND_ARCHITECTURE.md` | Components, services, utilities, patterns |
| `04_WHATSAPP_SYSTEM.md` | Anti-ban patterns, templates, Fonnte API |
| `05_USER_FLOWS.md` | All user flows with ASCII diagrams |
| `06_DEVELOPER_GUIDE.md` | Setup, adding features, testing, deployment |
| `07_API_REFERENCE.md` | All public/admin APIs, RPC functions |

---

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Required env vars:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_FONNTE_TOKEN=xxx  # Optional
```

---

## Architecture Summary

### Three Access Paths
1. **Admin**: `/admin/*` - Authenticated (role check)
2. **Penilai**: `/penilai` - NIP+HP verification
3. **Juri/Nominee**: `/juri`, `/nominee` - UUID token

### Five Modes
- **MODE_1A**: Numeric scoring per question
- **MODE_1B**: Quick vote (flat OR hybrid per category)
- **MODE_2**: Jury weighted category scoring
- **MODE_2A**: Criteria scoring by penilai

### Service Layer
- `votingService.js` - Public token-based (no auth)
- `adminService.js` - Authenticated admin
- `kirimWaService.js` - WhatsApp sending with anti-ban

---

## Critical Security Rules

1. **ALWAYS use RPC** for token fetching (bypasses RLS)
2. **Self-vote prevention** at TWO levels: client + DB constraint
3. **Mandatory all-nominee scoring** in MODE_1A

---

## Key Files

```
web-git/
├── src/
│   ├── App.jsx              # Router
│   ├── main.jsx             # QueryClient setup
│   ├── services/
│   │   ├── votingService.js # Public voting APIs
│   │   ├── adminService.js # Admin APIs
│   │   └── kirimWaService.js # WhatsApp
│   ├── utils/constants.js   # Enums, helpers
│   └── pages/
│       ├── admin/          # Admin pages
│       └── link-unik/      # Public pages
└── supabase/               # Database scripts
```

---

## Database

Main schema: `supabase/00_deploy_master.sql`

Key tables:
- `pegawai` - Employee master data
- `periode_penilaian` - Assessment periods
- `akses_penilai/juri/nominee` - Token management
- `penilaian_skor` - Mode 1A scores
- `suara_quick_vote` - Mode 1B votes
- `penilaian_juri` - Mode 2 scores

Key views:
- `view_tabulasi_mode_1a/1b/1c/2` - Real-time tabulation

---

## WhatsApp System

Two sending methods:
1. **Fonnte API** - Fast, auto (ban risk)
2. **Local Bot** - Safe, no ban (Baileys on localhost:3000)

Anti-ban patterns:
- Batch 2-5 messages with 3-8s delays
- 70% chance 45-120s pause between batches
- 10% random message variations
- Weekend 1.5x longer delays

---

## Environment Variables

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_FONNTE_TOKEN=xxx           # Fonnte WhatsApp API
VITE_BOT_URL=http://localhost:3000  # Local bot
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Token not working | Check `is_digunakan`, `notifikasi_wa_sent_at`, period status |
| Akses ditolak | Verify role_admin, ADMIN_KABKOTA limited to own kabkota |
| WA not sending | Check VITE_FONNTE_TOKEN, phone format (62xxx) |
| Scores missing | Check view_tabulasi, ensure nominees scored |

---

## For More Details

See individual documentation files:
- Security patterns → `01_PROJECT_OVERVIEW.md`
- Schema details → `02_DATABASE_SCHEMA.md`
- Component docs → `03_FRONTEND_ARCHITECTURE.md`
- WhatsApp details → `04_WHATSAPP_SYSTEM.md`
- User flows → `05_USER_FLOWS.md`
- Dev guide → `06_DEVELOPER_GUIDE.md`
- API docs → `07_API_REFERENCE.md`

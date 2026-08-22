# WhatsApp Notification System Documentation

---

## Architecture Overview

The system uses a **hybrid architecture** with multiple service layers:

```
kirimNotifikasiBatch() (Orchestrator)
    |
    ├── Fetch active templates from DB
    ├── Select template by category (NOMINEE/PENILAI/JURI)
    ├── Process in HYBRID BATCHES (2-5 messages per batch)
    |   └── For each message:
    |       - Generate personalized message with placeholders
    |       - Add 10% random variation
    |       - Apply human-like delay pattern
    |       - Send via wabotLokalService (local bot)
    |       - Log to log_notifikasi_wa table
    └── Batch pause between batches (45-120 seconds)

wabotLokalService (Primary) http://localhost:3000
    |
    └── Fallback: kirimPesanFonnte() via Fonnte API
```

---

## Anti-Ban Patterns

### Delay Patterns (Human-Like Timing)

| Pattern | Chance | Duration | Human Reason |
|---------|--------|----------|---------------|
| **Short** | 15% | 1-2 sec | "buru-buru" (hurrying) |
| **Normal** | 72% | 3-8 sec | Normal typing speed |
| **Long** | 8% | 15-45 sec | "terganggu" (distracted) |
| **Very Long** | 3% | 60-180 sec | "sibuk" (toilet/meeting) |

### Batch Processing

- **Batch Size**: 2-5 messages (random)
- **Small Batch Chance**: 30% (2-3 messages)
- **Batch Pause**: 45-120 seconds between batches
- **Batch Pause Chance**: 70%
- **Weekend Multiplier**: 1.5x longer pauses

### Contextual Delays

| Time Period | Multiplier | Reason |
|-------------|------------|--------|
| Weekend | 1.5x | More relaxed |
| Lunch (12-13) | 1.3x | Slower responses |
| Morning (8-9) | 0.8x | Warming up |
| Evening (17-18) | 1.4x | Tired |

### Safe Hours

- **Weekdays**: 08:00 - 21:00
- **Weekend**: 10:00 - 20:00

### Message Variations (10% chance)

- Add extra spaces after periods
- Add random emoji (👋, 📋, ✨, 📌, 🎯)
- Add "Mohon maaf apabila mengganggu" prefix
- Add "Yth." honorific for Bapak/Ibu

### Fonnte Human-Like Features

- 30% chance typing indicator
- 5% chance skip country code (62)
- Random typing time (1-3 seconds)

---

## Template Placeholders

### Available Placeholders

```javascript
const WA_PLACEHOLDERS = {
  NAMA: '[NAMA]',           // Recipient full name
  PANGGILAN: '[PANGGILAN]', // Bang/Kak/Bapak/Ibu based on NIP
  LINK: '[LINK]',           // Deep link to role page
  PERAN: '[PERAN]',         // Nominee/Penilai/Juri
  NAMA_PERIODE: '[NAMA_PERIODE]',
  TANGGAL_MULAI: '[TANGGAL_MULAI]',  // e.g., "1 Agustus 2026"
  TANGGAL_SELESAI: '[TANGGAL_SELESAI]'
};
```

### Replacement Logic

```javascript
generatePesan(templateText, replacements) {
  // Replaces both [KEY] and {KEY} formats
  pesan = pesan.replace(new RegExp(`\\[${key}\\]`, 'g'), value || '');
  pesan = pesan.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
}
```

### Greeting Calculation (hitungSapaan)

Based on NIP Baru (15+ digits):

| NIP Position | Value | Result |
|--------------|-------|--------|
| Char 0-3 | Birth Year | Age calculation |
| Char 14 | Gender | 1 = Male, else Female |
| Age < 28 | - | Empty string |
| Age 28-34 | Male | "Bang" |
| Age 28-34 | Female | "Kak" |
| Age 35+ | Male | "Bapak" |
| Age 35+ | Female | "Ibu" |

---

## Delay Configuration Constants

```javascript
// Normal delays
const NORMAL_DELAY_MIN = 3;  // seconds
const NORMAL_DELAY_MAX = 8;  // seconds

// Short pause
const SHORT_PAUSE_MIN = 1;
const SHORT_PAUSE_MAX = 2;
const SHORT_PAUSE_CHANCE = 0.15; // 15%

// Long pause
const LONG_PAUSE_MIN = 15;
const LONG_PAUSE_MAX = 45;
const LONG_PAUSE_CHANCE = 0.08; // 8%

// Very long pause
const VERY_LONG_PAUSE_MIN = 60;
const VERY_LONG_PAUSE_MAX = 180;
const VERY_LONG_PAUSE_CHANCE = 0.03; // 3%

// Batch configuration
const BATCH_SIZES = [2, 3, 4, 5];
const SMALL_BATCH_CHANCE = 0.30; // 30%
const BATCH_PAUSE_MIN = 45;      // seconds
const BATCH_PAUSE_MAX = 120;     // seconds
const BATCH_PAUSE_CHANCE = 0.70; // 70%
const WEEKEND_BATCH_PAUSE_MULTIPLIER = 1.5;
```

---

## Batch Processing Logic

### Main Loop (kirimNotifikasiBatch)

```
while (recipients remaining):
    1. Calculate batch size (2-5 random)
    2. Process messages in batch:
       for each message:
         - Generate personalized link by category
         - Apply template placeholders
         - Add message variation (10%)
         - Get random delay pattern
         - Wait delay
         - Send via wabotLokalService
         - Update log status
         - Call onProgress callback
    3. Batch pause (70% chance):
       - 45-120 sec pause
       - Random "reason" (ngopi, nyamuk, toilet, etc.)
```

### Link Generation by Category

```javascript
if (kategori === 'PENILAI') {
  link = `${baseUrl}/penilai/${token_akses}`;
} else if (kategori === 'JURI') {
  link = `${baseUrl}/juri?token=${token_akses}`;
} else { // NOMINEE
  link = `${baseUrl}/nominee?token=${token_akses}`;
}
```

---

## Database Logging

### log_notifikasi_wa

| Field | Description |
|-------|-------------|
| periode_id | Period reference |
| kategori | NOMINEE/PENILAI/JURI |
| pegawai_id | Recipient ID |
| token_id | Access token ID |
| template_id | Template used |
| nomor_hp | Formatted phone number |
| isi_pesan | Final message sent |
| status | PENDING/SENT/FAILED/WA.ME |
| sent_at | Timestamp when sent |
| error_message | Error details if failed |

### Token Updates

**akses_nominee, akses_penilai, juri_periode**:
- Updated with `notifikasi_wa_sent_at` timestamp after successful send

---

## Fonnte API Integration

### Endpoints Used

- **Single Send**: `POST https://api.fonnte.com/send`
- **Bulk Send**: Same endpoint with `data` parameter (JSON array)

### Request Format

```
Headers:
  Authorization: VITE_FONNTE_TOKEN
  Content-Type: application/x-www-form-urlencoded

Body:
  target: 62xxxxxxxxxxx
  message: Hello message
  countryCode: 62 (or 0 for 5% skip chance)
  delay: 2 (optional, server-side)
  typing: true (optional, 30% chance)
```

### Environment Variables

- `VITE_FONNTE_TOKEN` - Fonnte API token
- `VITE_BOT_URL` - Local bot URL (default: http://localhost:3000)

---

## Local Bot Integration (repositori-bot-terpisah)

The WhatsApp bot runs separately from the web app.

### Running the Bot

```bash
cd ../repositori-bot-terpisah
npm install
npm run dev
```

Output:
1. QR Code in terminal - scan with WhatsApp
2. Web Dashboard at http://localhost:3000

### Features

| Tab | Fungsi |
|-----|--------|
| **Periode** | Lihat token counts per periode |
| **Pegawai** | CRUD data pegawai |
| **Template** | Edit template pesan WA |
| **Kirim** | Kirim notifikasi bulk |

### Why Two Methods?

| Method | Advantages | Disadvantages |
|--------|------------|---------------|
| **Fonnte API** | Fast, automatic | Ban risk (location mismatch) |
| **Baileys (local bot)** | Safe, no ban | Must be online, need QR scan |

---

## Batch Pause Reasons (Logged)

Human-readable reasons for batch pauses:
- "ngopi dulu ☕"
- "nyamuk bentar 🦟"
- "scroll WA dulu 📱"
- "istirahat sebentar 💭"
- "respon chat lain 💬"
- "makan siang 🍱"
- "ke toilet 🚽"
- "bertaubat bentar 🤘"

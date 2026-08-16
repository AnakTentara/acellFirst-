# 🏰 Acell & Haikal Sanctuary - Project Context & Guidelines (CLAUDE.md)

Welcome, **Claude Opus (OhhMyAgent.com)**! This document contains the full architecture, conventions, security secrets, user preferences, and implementation history for the **Acell & Haikal Sanctuary** couple web application.

---

## 👑 Couple Identity & Global Rules

- **Couple**: 
  - **Prince 👑**: Haikal (Role: `boy`, Username: `haikal`, Nickname: `Prince 👑`)
  - **Princess 👑**: Acell (Role: `girl`, Username: `acell`, Nickname: `Princess 👑`)
- **Anniversary Date**: `2025-06-23` (23 Juni 2025)
- **Dedicated Port**: `23625` (representing the date `23-06-25`)
- **Exclusive Domain**: **`acellimut.my.id`** (Never use `haikaldev.my.id` or `acellimut.net`)
- **JWT & Webhook Secret**: `Senin23062025`
- **User Trust & Autonomy Rule**:
  > If the user says *"kerjakan tanpa aku"*, you must execute everything autonomously without asking for confirmation. Run terminal commands, edit files, build bundles, and push to GitHub directly.

---

## 🎨 UI/UX Design System & Aesthetics

- **Theme & Palette**: Apple macOS Sequoia inspired Glassmorphism.
  - Primary Brand Blue: `#2563eb` (Blue 600)
  - Deep Brand Blue: `#1e40af` (Blue 800)
  - Light Accent Background: `#eff6ff` (Blue 50)
  - Dark Slate Text: `#0f172a` (Slate 900)
  - Clean Muted Slate: `#64748b` (Slate 500)
  - **Rule**: NO pink theme, NO cluttered dashboard widgets. Keep it simple, premium, modern, fluid, and delightful.
- **Interactions**:
  - Sound effects powered by Web Audio API (`frontend/src/utils/sound.js` - `playClick`, `playHeartPop`, `playSparkle`).
  - Gmail-style single inbox reader with smooth slide transitions and Escape/Back button (`MailView.jsx`).
  - Glowing golden stars (`#eab308` filled star, `#fef08a` glass background, `#facc15` border) with instant optimistic UI updates.

---

## 📧 Email Aliases & Inbound Architecture

The webapp is bound to exactly **4 official couple email aliases**:
1. **`us@acellimut.my.id`** &mdash; Email Utama Berdua (Joint couple inbox)
2. **`shopping@acellimut.my.id`** &mdash; Khusus Belanja & E-commerce Receipts (Shopee, Tokopedia, TikTok Shop, Lazada, Apple)
3. **`etall@acellimut.my.id`** &mdash; Belanja, Tagihan & Semua Layanan Bersama
4. **`acell@acellimut.my.id`** &mdash; Email Pribadi Princess Acell

### Inbound Mail & AI Parser Flow:
- Inbound emails arrive via Cloudflare Email Routing & Webhook (`/api/mail/webhook`).
- **AI Intelligence**:
  - Provider: **OhhMyAgent.com** (`https://ohhmyagent.com/v1`)
  - Model: `ohh/gpt-5.6` or `ohh/opus-5`
  - *Important Parameter Note*: Reasoning models do not support `temperature: 0.2`. Omit or use default `1`.
  - AI auto-categorizes incoming emails (`shopping`, `love`, `personal`), generates 2-line summaries, smart tags (`#Shopee`, `#SPX`, `#Fashion`), and extracts courier tracking numbers.

---

## 🚚 Shopping Radar & Courier Tracking System

- **Courier Auto-Detection**:
  - **J&T Cargo / J&T Express**: Resi prefix `JY...` (e.g. real user package `JY1457499661`), `JP...`, `JX...`, `JNA...`
  - **SPX Express**: `SPX...` / `ID...`
  - **JNE**: `JNE...` / 15-16 digits
  - **SiCepat**: `00...` / 12 digits
  - **Lion Parcel**: `LP...` / 10-12 digits
  - **POS Indonesia**, **Anteraja**, **Ninja Xpress**, **Paxel**
- **1-Click AI Auto-Scan**: Users can paste any resi code into "✨ Scan Resi AI Otomatis" in `ShoppingTracker.jsx` to instantly generate origin, checkpoint timeline, radar map coordinates, and delivery estimate.

---

## 🏠 Sanctuary Delivery Addresses

Managed in `backend/src/routes/addressRoutes.js` and `frontend/src/components/SettingsModal.jsx`:
1. **Sanctuary Utama Bandung 🏠** (Dago, Coblong, Kota Bandung &mdash; Lat: `-6.9175`, Lng: `107.6191` &bull; Primary Default)
2. **Sanctuary Kedua Jakarta 🏢** (Sudirman, Jakarta Selatan &mdash; Lat: `-6.2088`, Lng: `106.8456` &bull; Secondary)
3. Custom addresses can be added, deleted, or set as primary with 1 click.

---

## 📁 Codebase Structure

```
e:\CoupleProject/
├── backend/
│   ├── data/
│   │   └── couple.db               # SQLite database
│   └── src/
│       ├── config.js               # Port 23625, JWT, AI, SMTP configs
│       ├── db.js                   # Schema, migrations & seeds
│       ├── server.js               # Express app, SSE events, static serving
│       ├── parsers/
│       │   └── receiptParser.js    # Regex courier fallback parser
│       ├── routes/
│       │   ├── addressRoutes.js    # Address CRUD & primary toggle
│       │   ├── authRoutes.js       # PIN login & profile management
│       │   ├── loveRoutes.js       # Love letters, counters & capsules
│       │   ├── mailRoutes.js       # Inbound webhook, mail stats, trash/spam
│       │   ├── shoppingRoutes.js   # Shopping radar & 1-click scan-resi
│       │   ├── systemRoutes.js     # Health, domain switch, DNS Cloudflare
│       │   └── wishlistRoutes.js   # Wishlist items
│       └── services/
│           ├── aiService.js        # OhhMyAgent GPT-5.6/Opus & Geo coordinates
│           ├── mailService.js      # Mail processing & receipt integration
│           └── pushService.js      # Server-Sent Events (SSE) broadcaster
├── frontend/
│   ├── dist/                       # Compiled production build (tracked in git)
│   └── src/
│       ├── App.jsx                 # Main state, folder nav, optimistic star/read
│       ├── index.css               # Apple Sequoia Slate Blue CSS design system
│       ├── components/
│       │   ├── MailView.jsx        # Single-page Gmail style reader & transitions
│       │   ├── SettingsModal.jsx   # Sanctuary addresses, Domain, SMTP, AI tester
│       │   ├── ShoppingTracker.jsx # Radar map, checkpoints & 1-click scan modal
│       │   ├── Sidebar.jsx         # Folder navigation & zero unread badge
│       │   └── TopBar.jsx          # Live sync, quick alias switch & user toggle
│       ├── services/
│       │   └── api.js              # REST client & EventSource subscriber
│       └── utils/
│           └── sound.js            # Web Audio API interactive sound effects
├── package.json                    # Root scripts ("build", "build:frontend", "dev")
├── run.sh                          # Pterodactyl container launcher
├── start-claude.ps1                # PowerShell launcher for Claude Code CLI (OMA)
└── CLAUDE.md                       # This context file
```

---

## 🛠️ Commands & Git Workflow

### Building Frontend Bundle:
```bash
npm run build:frontend
```

### Git Commit & Push (Windows Terminal):
```powershell
cd e:\CoupleProject; git add .; git commit -m "(1 line descriptive commit info)"; git push
```

### Remote Repository:
`https://github.com/AnakTentara/acellFirst-.git`

### Pterodactyl Production Server:
Hosted at `/home/container`. To apply updates:
```bash
git pull
bash run.sh
```

---

## 🚀 Upcoming Project Roadmap

1. **Flutter Cross-Platform Mobile App**:
   - Connect to backend REST API on `https://acellimut.my.id/api` (or custom server host).
   - Real-time SSE / OneSignal push notification for incoming emails and package delivery updates.
   - Clean iOS/Android native feel with shared theme.
2. **Enhanced Live Webhook Tracking**:
   - Direct courier API integrations for automatic checkpoint updates.
3. **Outbound SMTP**:
   - Support sending emails to outside world from `us@acellimut.my.id` or `acell@acellimut.my.id`.

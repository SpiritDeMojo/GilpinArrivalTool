<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🏨 Gilpin Hotel — Arrival Intelligence Platform

**Enterprise-grade, real-time arrival orchestration for luxury hospitality.  
Purpose-built for six operational dashboards, AI-assisted guest preparation, and seamless cross-device synchronisation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Pro-4285F4?logo=google)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://vercel.com/)

</div>

---

## Overview

The Gilpin Arrival Tool transforms unstructured PMS arrival PDFs into a live, interactive intelligence platform. It enables **Reception**, **Housekeeping**, **Maintenance**, **Front of House**, **In House**, and **Turndown** teams to coordinate guest arrivals, room readiness, and operational workflows in real-time — across every device, every department, every arrival day.

> **Production deployed at [Gilpin Hotel & Lake House](https://www.thegilpin.co.uk/)** — serving daily operations across multiple teams and devices.

---

## Core Capabilities

### 📄 Intelligent PDF Extraction
Column-aware PDF parser (1,200+ lines) that extracts 20+ fields per guest using X-coordinate spatial analysis. Extracts room assignments (31-room map with aliases), ETA windows (multi-format: am/pm, ranges, 3/4-digit), car registrations (multi-pattern UK plate matching with AI fallback, short-plate support), duration (first-line departure date calculation), facilities & dining (venue-tagged: Spice, Source, Lake House, ESPA — date-validated), allergies & dietary (UK Top 14 allergen scan), occasions, in-room items (28 keywords), loyalty history, rate codes (37 variants), booking source, pax (ACEB), unbooked request detection, **Previous Guest Issue (PGI) detection** with prominent warnings, and **dinner coverage checker** (flags unbooked dinner nights). Tested against 163 guests across 13 real PDFs with 0 extraction errors.

### 🤖 Gemini AI Integration
- **AI Audit** — Gemini 2.5 Pro refines parsed data in a single pass: detects missing package items, formats notes with operational emojis, extracts car registrations the regex misses, generates actionable greeting strategies, and routes allergies/dietary/pet info to dedicated HK notes. Anti-fabrication validation prevents hallucinated facilities and car registrations
- **AI Live Assistant** — Conversational AI colleague powered by Gemini 2.5 Flash Native Audio. Answers guest queries, adds room notes, updates housekeeping/guest status via voice or text commands in real-time. Includes **voice-to-text microphone** button in the chat input bar using the Web Speech API
- **AI Cleaning Priority** — Intelligent room preparation ordering based on ETA, guest type, and operational constraints
- **AI Room Upgrades** — Analyses guest profiles against empty rooms and suggests strategic upgrades with deduplication (each room suggested at most once)
- **AI Sentiment Analysis** — Generates actionable guest tags (Quiet Room, Allergy Alert, Anniversary) from notes and preferences
- **AI Analytics** — Operational intelligence dashboards with arrival patterns, property breakdown, guest profile analysis, and **average occupancy** calculation (arrivals vs. 39-room capacity)

### 📡 Fleet Sync Engine
Real-time multi-device synchronisation via Firebase Realtime Database. Upload multiple arrival PDFs on one device — all connected devices update instantly with every day visible as session tabs. Status changes, notes, and deletions propagate across the fleet in milliseconds.

### 📊 Department Dashboards

| Dashboard | Purpose | Key Features |
|-----------|---------|--------------|
| **Arrivals** | Master guest manifest | Full booking data, PDF extraction, ETA timeline, car registrations, VIP/occasion flags |
| **Housekeeping** | Room preparation & readiness | Room readiness status, in-room delivery tracking, AI cleaning priority, cross-department notes |
| **Maintenance** | Room inspection & handoff | Independent maintenance status, cross-department room notes, priority tagging |
| **Front of House** | Guest presence & service | On-site/off-site tracking, courtesy call logging, guest greeting intelligence |
| **In House** | Overnight operations | 38-room grid (Main Hotel + Lake House), occupancy stats, room moves, EV charging, AI upgrades, stayover tracking, print reports |
| **Turndown** | Evening service preparation | Turndown status tracking, dinner time/venue management, stayover + arrival coverage |

### 📋 Booking Stream & SOP
Per-guest raw data view that structures the original PMS text into readable sections (mirroring the PDF layout). Built-in SOP modal (v23.0, 30 sections) covering every operational workflow from PDF upload to itinerary generation.

### 💬 Real-Time Messenger
Tabbed chat panel with cross-department Team Chat and AI Live Assistant. Features messenger-style bubbles with SVG tails, message grouping, timestamp dividers, long-press emoji reactions (👍 ❤️ 😂 😮 🙏), real-time typing indicators, Framer Motion spring animations, browser notifications + audio chime, FAB pulse ring for unread messages, and **voice-to-text microphone** button (Web Speech API dictation).

### 🔔 Smart Notifications
Cross-device notification system with distinct audio tones (chime, alert, doorbell). Triggers on: HK status changes, maintenance status changes, guest arrivals, check-ins, check-outs, guest awaiting room, courtesy call due, no-shows, room ready, urgent room notes, room note resolved, and team chat messages. Department-specific badge counters with mute toggle.

### 🖨️ Smart Print Layouts
Three optimised print modes — **Master**, **Greeter**, and **Delivery** — with auto-sizing columns and dense formatting that maximises paper utilisation in landscape orientation. Plus dedicated **In House Report** and **Turndown List** print layouts.

### 📦 Package Generator
Bespoke guest itinerary builder with preset templates (Magical Escape, Gilpinmoon), date automation, visual styling (fonts, accent colours, custom logos), direct WYSIWYG editing, formatting toolbar (bold/italic/underline/size), and Save/Load (JSON). Print-ready A4 landscape output.

### 🔌 Connection Resilience
Production-hardened reconnection engine with auto-reconnect on background return (`visibilitychange` + `focus`), stale watchdog (30s timeout), and nuclear reconnect (full Firebase SDK teardown/rebuild) for permanently broken mobile WebSockets.

---

## Premium Animation Engine

The interface features a handcrafted animation system designed for a polished, premium feel across both **light** and **dark** themes.

| Category | Implementation |
|----------|---------------|
| **Card Entrances** | 3D perspective tilt with blur-to-focus (Framer Motion spring physics: stiffness 400, damping 35, mass 0.8) |
| **Page Transitions** | AnimatePresence mode="wait" with spring-physics tab switching, sliding gold indicator pill |
| **Micro-Interactions** | `whileTap` scale-down with spring feedback on all action buttons, hover lift + gold shadow depth |
| **Stat Cards** | 3D tilt on hover (`rotateX`, `rotateY`) with enhanced gold shadow for premium depth |
| **Navbar** | 3D logo globe with perspective tilt, glass overlay, hover pop-out (1.6×), overshoot cubic-bezier transitions, gold glow ring on hover |
| **Theme Transitions** | Smooth 0.3s colour transitions on light/dark toggle, GPU-composited with `will-change` |
| **Dark Mode** | Full dual-theme support — dark-adapted note backgrounds, badge colours, form inputs, and text contrast throughout |
| **Print Safety** | All animations disabled via `@media print` for clean, static print layouts |
| **Performance** | `React.memo` on 10 core components, `will-change` compositing, reduced `backdrop-filter` on mobile |

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PDF Upload │────▶│  PDF Parser  │────▶│  Guest State  │
│  (pdfjs-dist)│     │ (pdfService) │     │ (React State) │
└──────────────┘     └──────────────┘     └───────┬───────┘
                                                  │
                     ┌──────────────┐              │
                     │ Vercel API   │◀─────────────┤
                     │ /api/gemini-*│              │
                     │ (server-side)│              │
                     └──────┬───────┘              │
                            │                     │
                     ┌──────▼───────┐              │
                     │  Gemini AI   │
                     │(2.5 Pro/Flash)│
                     └──────────────┘              │
                                                  │
                     ┌──────────────┐              │
                     │   Firebase   │◀─────────────┘
                     │ (Fleet Sync) │──────▶ All Devices
                     └──────┬───────┘        (all days)
                            │
                     ┌──────▼───────┐
                     │  Reconnect   │
                     │  Engine      │
                     │ (Auto/Nuclear)│
                     └──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 · TypeScript 5.7 · Modular Vanilla CSS (10 files) |
| **Build** | Vite 6 |
| **Animations** | Framer Motion (spring physics, AnimatePresence, staggered entrances) + CSS keyframes |
| **Backend** | Vercel Serverless Functions (`/api/gemini-*`) |
| **PDF Parsing** | pdfjs-dist (Mozilla PDF.js) |
| **AI** | Google Gemini 2.5 Pro (audit) · Gemini 2.5 Flash (analytics, sentiment, cleaning, upgrades) via `@google/genai` + Gemini 2.5 Flash Native Audio (live assistant) |
| **Audio** | AudioWorklet API (ScriptProcessorNode fallback) |
| **Real-Time Sync** | Firebase Realtime Database (defense-in-depth sanitisation) |
| **Weather** | Open-Meteo API (Windermere, no API key required) |
| **Testing** | Vitest |
| **Export** | XLSX (SheetJS) |

---

## Additional Features

- ⚡ **EV Charging Tracker** — Toggle cars on/off EV chargers from the In House dashboard. ⚡ badge on room cards, charging count in header stats, state syncs via Firebase
- 🏠 **AI Room Upgrades** — In House dashboard suggests strategic room upgrades via Gemini AI. Server-side deduplication ensures each empty room is suggested at most once
- 🌙 **Turndown Dashboard** — Dedicated tab for evening service: turndown status, dinner time/venue management, covers stayovers and same-day arrivals
- 🎨 **Ivory / Obsidian Theming** — Dual premium themes with branded names. Toggle via hamburger menu. All dashboards, modals, forms, and badges adapt automatically
- 🪟 **Full-Width Tab Layout** — Desktop tabs stretch edge-to-edge with even distribution. Mobile uses scroll-snap horizontal slider with abbreviated labels
- 📡 **Sync Pill Indicator** — Polished pill button (SYNCED / CONNECTING / OFFLINE) next to hamburger menu with animated glow dot and colour-coded states
- 🔀 **Dashboard Sorting** — Sort any dashboard by ETA (earliest first) or Room Number (ascending). Preferences persist per dashboard
- 🧠 **AI Note Placement** — Notes auto-route to the correct column: Intelligence, Prefill Notes, HK (`[HK]`), or Maintenance (`[MAINT]`)
- 📱 **Responsive Mobile UI** — Progressive breakpoints (1024 → 768 → 480 → 400px) with adaptive tab labels, scroll-snap horizontal tabs, and tighter density
- 📱 **Mobile Debug Overlay** — Append `?debug=1` for on-screen console showing logs, connection state, and errors
- 🌦️ **Live Weather Widget** — Real-time Windermere weather (temperature + icon) in the navbar. Auto-refreshes every 15 minutes
- 🟢 **Guest Presence** — On-site / Off-site tracking per room, visible across all dashboards
- 🔄 **Room Move Tracking** — Full audit trail when guests are moved between rooms
- 📜 **Guest Activity Audit Log** — Timestamped record of all status changes and actions per guest
- 🛡️ **Defense-in-Depth Sanitisation** — All Firebase write paths sanitise `undefined → null` to prevent RTDB crashes
- 🔄 **37 Rate Code Variants** — Parser recognises MINIMOON, DBB, BB_2, WIN codes, underscore variants, Lake House prefixes
- 📦 **13 Package Mappings** — AI audit maps rate codes to human-readable names (Winter Offer, B&B, Room Only, etc.)
- 🧱 **Modular CSS Architecture** — 10 specialised files (design-tokens, variables, base, animations, navbar, components, in-house, responsive, print, barrel) for maintainability
- 🏠 **In House Dashboard** — Real-time 38-room occupancy grid with arrival/stayover detection, room moves (Firebase sync), car plate tracking, EV charging, and print report
- 🐕 **Dogs In House** — Breed-specific pet detection (cockapoo, labrador, spaniel + 15 breeds) with contextual phrase matching (dog bed, dog bowl, pet in room). Anti-false-positive: word-boundary regex, negation handling ("no dogs"), and curated-field-only scanning
- 🏷️ **Smart Flag Detection** — 10 auto-flags (VIP, allergies, pets, occasions, prev issues) with word-boundary matching for prone-to-false-positive flags. Scans curated fields only — never raw PMS dump
- 🏨 **Room 29 (Mint)** — Excluded from all room lists as it is not yet built / in use

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A Firebase project (for multi-device sync)
- A Gemini API key (for AI features — optional)

### Installation

```bash
git clone https://github.com/SpiritDeMojo/GilpinArrivalTool.git
cd GilpinArrivalTool
npm install
cp .env.example .env
```

### Configuration

#### Local `.env` (Firebase — client-side)

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### Vercel Environment Variables (AI — server-side)

Set in **Vercel → Settings → Environment Variables**:

| Variable | Prefix | Purpose |
|----------|--------|---------|
| `GEMINI_API_KEY` | No `VITE_` | Server-side only — powers AI Audit, Analytics, Cleaning Order, Live Assistant |
| `VITE_FIREBASE_*` | `VITE_` | Same Firebase values as `.env` above |

> **Note:** AI features (Audit, Analytics, Live Assistant) require Vercel deployment. They are unavailable when running locally.

### Development

```bash
npm run dev        # Start dev server
npx vitest run     # Run tests
npm run build      # Production build
```

---

## Multi-Device Workflow

1. **Upload** one or more PMS arrival PDFs on any device (typically the reception desktop)
2. **Multi-day** — each uploaded PDF becomes a tab in the Session Bar; upload Monday, Tuesday, Wednesday and all appear
3. **All devices** auto-sync via Firebase — every day, every status change, every note propagates instantly
4. **Each department** uses their dedicated dashboard view
5. **AI Audit** (optional) refines all guest data in one click
6. **Delete** a session on any device and it's removed from all connected devices

---

## Security

| Measure | Implementation |
|---------|---------------|
| **API Key Isolation** | Gemini API key stored in Vercel env vars — never exposed in the client bundle |
| **Server-Side Proxy** | All AI calls proxied through Vercel Serverless Functions (`/api/gemini-*`) |
| **Firebase Auth** | API keys stored in `.env` (gitignored), security rules control database access |
| **Data Residency** | PDF data stays in-browser and Firebase — no third-party storage |
| **CSP Headers** | Content Security Policy restricts resource loading to approved domains only |
| **HTTP Security** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` |
| **Asset Security** | Brand assets served locally — zero external image hosting dependencies |

---

## License

Private — Gilpin Hotel & Lake House. All rights reserved.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🏨 Gilpin Hotel Arrival Tool

**A real-time, multi-department arrival management system for luxury hospitality.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Realtime_DB-FFCA28?logo=firebase)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?logo=google)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)

</div>

---

## Overview

The Gilpin Arrival Tool transforms the daily arrival PDF from the Property Management System (PMS) into a live, interactive dashboard. It enables **Reception**, **Housekeeping**, **Maintenance**, and **Management** to coordinate guest arrivals in real-time across multiple devices.

### Key Capabilities

- 📄 **Smart PDF Parser** — Extracts guest data, room assignments, ETAs, car registrations, facilities, allergies, occasions, and in-room items from PMS arrival PDFs with high accuracy
- 🤖 **AI-Powered Audit** — Gemini 2.0 Flash refines parsed data: detects missing package items, formats notes with operational emojis, extracts car registrations the regex misses, and generates actionable greeting strategies
- 📡 **Fleet Sync (Firebase)** — Real-time multi-device synchronisation via Firebase Realtime Database. Upload multiple arrival PDFs on one device, all connected devices update instantly with every day visible as tabs
- 📅 **Multi-Day Sessions** — Upload Monday, Tuesday, Wednesday PDFs and all appear as tabs in the Session Bar. All connected devices see every day. Deletions propagate across all devices instantly
- 🖨️ **Smart Print Layouts** — Three print modes (Master, Greeter, Delivery) with auto-sizing columns and dense formatting that maximises paper utilisation in landscape
- 💬 **Messenger** — Tabbed chat panel with cross-department Team Chat and AI Live Assistant (voice & text). Messenger-style bubbles with SVG tails, message grouping, timestamp dividers, long-press emoji reactions (👍 ❤️ 😂 😮 🙏), real-time typing indicators, Framer Motion spring animations, browser notifications + audio chime for new messages, and FAB pulse ring when unread
- 🤖 **AI Live Assistant** — Conversational AI colleague powered by Gemini 2.5 Flash native audio. Answers guest queries, adds room notes, updates housekeeping/guest status via voice or text commands
- 📊 **Department Dashboards** — Purpose-built views for Reception, Housekeeping, and Maintenance with independent status tracking
- 🧠 **AI Smart Notes (hkNotes)** — Gemini routes allergies, dietary restrictions, pet requirements, and room prep instructions to a dedicated `hkNotes` field for housekeeping-specific intelligence
- 🌦️ **Live Weather Widget** — Real-time Windermere weather (temperature + emoji icon) in the navbar via Open-Meteo API. Auto-refreshes every 15 minutes. Falls back to static title if offline
- 🌐 **3D Logo Globe** — 76px spherical logo with perspective tilt, glass overlay, hover pop-out effect (1.6× scale with transparent background), and spin-in entrance animation
- 🔌 **Connection Recovery** — Auto-reconnect on background return (visibilitychange + focus), stale watchdog (30s), and nuclear reconnect (full Firebase SDK teardown/rebuild) for permanently broken mobile WebSockets
- 🔀 **Dashboard Sorting** — Sort any dashboard by ETA (earliest first) or Room Number (ascending). Sort preferences persist per dashboard within the session
- 🧠 **AI Note Placement** — AI notes route to the correct column: Intelligence (preferences), Notes (prefillNotes), HK (tagged [HK]), or Maintenance (tagged [MAINT])
- 📱 **Mobile Debug Overlay** — Add `?debug=1` to URL for an on-screen console showing all logs, connection state, and errors without DevTools
- 🎨 **Production-Grade Theming** — Dark mode-aware inputs across all dashboards, GPU-composited animations with `will-change`, reduced `backdrop-filter` on mobile, simplified mobile entrance animations
- 🛡️ **Defense-in-Depth Sanitisation** — All Firebase write paths (`syncSession` + `updateGuestFields`) sanitise `undefined → null` before writing. Prevents Firebase RTDB crashes from any source
- ⚡ **React.memo Optimisation** — 10 core components (GuestRow, GuestMobileCard, ETATimeline, SearchFilter, BookingStream, all 3 dashboards, NotificationToast, LoadingHub) wrapped with `React.memo` to prevent cascading re-renders
- 🔄 **37 Rate Code Variants** — Parser recognises MINIMOON, DBB, BB_2, WIN codes, underscore variants, Lake House prefixes — ordered longest-first for accurate matching
- 📦 **13 Package Mappings** — AI audit maps rate codes to human-readable names: Winter Offer, B&B, Room Only, DBB, Mini Moon, Magical Escape, Celebration, Complimentary, Advanced Purchase, and Lake House variants

---

## Department Dashboards

| Dashboard | Purpose | Key Features |
|-----------|---------|--------------|
| **Reception** | Guest arrival workflow | ETA timeline, check-in flow, guest status management, courtesy call tracking |
| **Housekeeping** | Room preparation | Room readiness status, in-room delivery tracking, AI cleaning priority |
| **Maintenance** | Room inspection | Independent maintenance status, cross-department room notes |
| **Analytics** | Operational overview | Arrival counts, property breakdown (Main Hotel / Lake House), allergy & VIP tracking |

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
                     │  Gemini AI   │              │
                     │  (2.5 Flash) │              │
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

- **Frontend:** React 19 + TypeScript 5.7 + Vanilla CSS (custom design system with CSS variables)
- **Build:** Vite 6
- **Animations:** Framer Motion (spring physics, AnimatePresence, staggered entrances) + CSS keyframes (FAB breathing, ring pulse, panel transitions)
- **Backend:** Vercel Serverless Functions (API routes for AI calls)
- **PDF Parsing:** pdfjs-dist (Mozilla PDF.js)
- **AI:** Google Gemini 2.5 Flash (via @google/genai) + Gemini Live API for native audio
- **Audio Capture:** AudioWorklet API (with ScriptProcessorNode fallback)
- **Real-time Sync:** Firebase Realtime Database (with defense-in-depth sanitisation)
- **Weather:** Open-Meteo API (Windermere, no API key required)
- **Testing:** Vitest
- **Export:** XLSX (SheetJS)
- **Performance:** React.memo on 10 core components, debounced reconnect handlers, stable useCallback references

---

## UI/UX Design

The interface features a handcrafted animation engine designed for a premium, responsive feel across both **light** and **dark** themes.

| Category | Effects |
|----------|---------|
| **Entrance Animations** | Content fade-slide-up on load, staggered dashboard pill cascade (50ms), session tab slide-in (60ms), table row stagger (20ms), Framer Motion AnimatePresence collapse/expand on guest cards |
| **Micro-Interactions** | Button press scale (0.96×), table row hover-lift with shadow, dashboard pill hover-lift, status badge scale (1.05×), input focus golden glow, mobile card touch press-down, chat message spring entrance (slide + scale), long-press emoji reaction picker, typing indicator dots |
| **View Transitions** | Framer Motion AnimatePresence mode="wait" — tab switch scale-up + fade-in + de-blur, whileHover/whileTap spring feedback, active tab golden shimmer sweep, non-active tab ambient golden glow |
| **Theme Transitions** | All colours transition smoothly (0.3s) on light/dark toggle, logo adapts with dark background + golden shadow, weather widget inherits theme colours |
| **Navbar** | 3D logo globe with perspective tilt (rotateY -12°, rotateX 5°), glass radial gradient overlay, hover pop-out (1.6× scale, mix-blend-mode: multiply for transparent background), spin-in entrance animation, live weather display |
| **Premium Scrollbar** | Custom golden-tinted scrollbar thumb with rounded corners |
| **Print Safety** | All animations disabled via `@media print` — clean, static print layouts |

---

## PDF Parser Features

The parser extracts structured guest data from PMS arrival PDFs:

| Field | Extraction Method |
|-------|-------------------|
| Room & Room Type | Pattern matching against `ROOM_MAP` (Main Hotel 1-30, Lake House 51-58) |
| Guest Name | Position-based extraction from header row, title stripping |
| Car Registration | Multi-pattern UK plate matching (new format, prefix, numeric prefix, short), `*` prefix stripping, adjacent item merging. AI fallback via Gemini |
| ETA | Booking notes `ETA:` label (primary), first-line time (fallback). Handles dot-formats (`2.30pm`), ranges (`2-3pm`), 24h |
| Facilities | Slash-delimited scan (`/Spice:`, `/Source:`) + standalone dinner/spa/champagne line capture |
| Allergies | Dedicated `Allergies:` section extraction, filters NDR/None, keyword scan for dietary requirements |
| Occasion | `Occasion:` + `Special Occasion:` extraction with emoji highlighting |
| In-Room Items | 28-keyword scan (Champagne, Spa Hamper, Dog Bowl, Rose Petals, etc.) |
| Loyalty / History | `Been Before:` extraction with visit count |
| Notes | Multi-section consolidation (HK Notes, Guest Notes, Booking Notes, Traces) with noise filtering |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A Firebase project (for multi-device sync)
- A Gemini API key (for AI features — optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/SpiritDeMojo/GilpinArrivalTool.git
cd GilpinArrivalTool

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# See .env.example for all available options
```

### Configuration

#### Local `.env` file (Firebase only — client-side)

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### Vercel Environment Variables (AI features — server-side)

Set in **Vercel → Settings → Environment Variables**:

| Variable | Prefix | Purpose |
|----------|--------|---------|
| `GEMINI_API_KEY` | No `VITE_` | Server-side only — powers AI Audit, Analytics, Cleaning Order, Live Assistant |
| `VITE_FIREBASE_*` | `VITE_` | Same Firebase values as `.env` above |

> **Note:** AI features (Audit, Analytics, Live Assistant) require Vercel deployment. They are unavailable when running locally.

### Run Locally

```bash
npm run dev
```

### Run Tests

```bash
npx vitest run
```

### Build for Production

```bash
npm run build
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

- 🔒 **Gemini API key is server-side only** — stored in Vercel env vars, never exposed in the client JS bundle
- 🔒 **Vercel Serverless Functions** proxy all AI calls (`/api/gemini-*`), keeping credentials off the client
- 🔒 Firebase API keys stored in `.env` (never committed to git)
- 🔒 Firebase security rules control database access
- 🔒 PDF data stays in-browser and Firebase (no third-party storage)
- 🔒 Content Security Policy (CSP) headers restrict resource loading to approved domains
- 🔒 Brand assets (logo) served locally — no external image hosting dependencies

---

## License

Private — Gilpin Hotel & Lake House. All rights reserved.

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
- 📡 **Fleet Sync (Firebase)** — Real-time multi-device synchronisation via Firebase Realtime Database. Upload a PDF on one device, all connected devices update instantly
- 🖨️ **Smart Print Layouts** — Three print modes (Master, Greeter, Delivery) with optimised column widths and dense formatting for maximum page utilisation
- 💬 **Unified Chat Panel** — Tabbed interface with cross-department Team Chat and AI Live Assistant (voice & text). Delete chat, auto-connect, HTTPS voice/HTTP text-only modes
- 🤖 **AI Live Assistant** — Conversational AI colleague powered by Gemini 2.5 Flash native audio. Answers guest queries, adds room notes, updates housekeeping/guest status via voice or text commands
- 📊 **Department Dashboards** — Purpose-built views for Reception, Housekeeping, and Maintenance with independent status tracking

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
                     │  Gemini AI   │◀─────────────┤
                     │  (AI Audit)  │──────────────┤
                     └──────────────┘              │
                                                  │
                     ┌──────────────┐              │
                     │   Firebase   │◀─────────────┘
                     │ (Fleet Sync) │──────▶ All Devices
                     └──────────────┘
```

### Tech Stack

- **Frontend:** React 19 + TypeScript 5.6 + Tailwind CSS
- **Build:** Vite 6
- **PDF Parsing:** pdfjs-dist (Mozilla PDF.js)
- **AI:** Google Gemini 2.5 Flash (via @google/genai) + Gemini Live API for native audio
- **Real-time Sync:** Firebase Realtime Database
- **Testing:** Vitest
- **Export:** XLSX (SheetJS)

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

Edit your `.env` file:

```env
# Firebase (required for multi-device sync)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# AI Features (optional)
VITE_GEMINI_API_KEY=your-gemini-api-key
```

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

1. **Upload** a PMS arrival PDF on any device (typically the reception desktop)
2. **Share** the session URL to other devices (phones, tablets)
3. **All devices** auto-sync via Firebase — status changes, notes, and room updates propagate instantly
4. **Each department** uses their dedicated dashboard view
5. **AI Audit** (optional) refines all guest data in one click

---

## Security

- 🔒 API keys stored in `.env` (never committed to git)
- 🔒 Firebase security rules control database access
- 🔒 No server-side code — all processing happens client-side
- 🔒 PDF data stays in-browser and Firebase (no third-party storage)
- 🔒 Gemini API calls use the user's own API key

---

## License

Private — Gilpin Hotel & Lake House. All rights reserved.

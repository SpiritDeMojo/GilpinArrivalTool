# Security

## Architecture

### API Keys

| Key | Location | Access |
|-----|----------|--------|
| Gemini API Key | Server-side `process.env.GEMINI_API_KEY` | Via Vercel API routes only |
| PMS API Key | Server-side `process.env.PMS_API_KEY` | Via `/api/pms-proxy` only |
| Firebase Config | Client-side `VITE_FIREBASE_*` | Public by design (see below) |

### Firebase Config (Public by Design)

Firebase API keys are **project identifiers**, not secrets. They identify which Firebase project to connect to, but do not grant privileged access. Security is enforced via **Firebase Security Rules** (`database.rules.json`), not by hiding the config.

This is [standard Firebase architecture](https://firebase.google.com/docs/projects/api-keys).

### API Route Protection

All Vercel serverless functions in `/api/` are protected by `_apiGuard.ts`:
- **Origin validation** — only requests from allowed domains are accepted
- **CORS headers** — proper preflight handling
- **Method guards** — each route accepts only its expected HTTP method

### Authentication Model

This is an internal hotel operations tool. Users identify themselves by name (not a password). This is intentional for the operational context — staff need quick, frictionless access.

**If external access is ever needed**, upgrade to Firebase Authentication with role-based access control.

## Reporting

If you discover a security issue, please contact the repository owner directly.

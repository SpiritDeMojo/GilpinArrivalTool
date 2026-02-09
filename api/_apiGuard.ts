import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared API security guard for all Vercel serverless functions.
 * 
 * - Blocks cross-origin requests from unknown domains
 * - Same-origin requests (no Origin header) are always allowed
 * - Adds CORS headers for browser preflight
 */

const ALLOWED_ORIGINS = [
    // Production (add your actual Vercel domains here)
    'https://gilpin-arrival-tool.vercel.app',
    'https://gilpinarrivaltool.vercel.app',
    // Local dev
    'http://localhost:',
    'http://127.0.0.1:',
];

export function isOriginAllowed(origin: string): boolean {
    if (!origin) return true; // Same-origin requests don't send Origin header — always safe
    // Check explicit matches
    if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) return true;
    // Allow any Vercel preview/deployment URL
    if (origin.endsWith('.vercel.app')) return true;
    // Allow the auto-detected Vercel URL
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && origin.includes(vercelUrl)) return true;
    return false;
}

/**
 * CORS + Origin guard — handles OPTIONS preflight and origin validation.
 * Returns true if the request is allowed to proceed, false if it was handled
 * (preflight response sent, or 403 returned).
 */
export function withCors(req: VercelRequest, res: VercelResponse): boolean {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.status(204).end();
        return false;
    }

    // Check origin from headers
    const origin = req.headers.origin || '';

    // Validate origin (empty = same-origin = always allowed)
    if (!isOriginAllowed(origin)) {
        console.warn(`[API Guard] Blocked cross-origin request from: ${origin}`);
        res.status(403).json({ error: 'Forbidden — cross-origin request not allowed' });
        return false;
    }

    // Set CORS headers for cross-origin allowed requests
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    return true;
}

/** @deprecated Use withCors() instead — same behaviour, clearer name */
export const apiGuard = withCors;


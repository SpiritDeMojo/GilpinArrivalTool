import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Shared API security guard for all Vercel serverless functions.
 * 
 * - Validates Origin / Referer against allowed domains
 * - Adds CORS headers for browser preflight
 * - Returns true if the request is allowed, false if blocked (response already sent)
 */

const ALLOWED_ORIGINS = [
    // Production
    'https://gilpin-arrival-tool.vercel.app',
    'https://gilpinarrivaltool.vercel.app',
    // Preview deployments (Vercel pattern)
    '.vercel.app',
    // Local dev
    'http://localhost:',
    'http://127.0.0.1:',
];

function isOriginAllowed(origin: string): boolean {
    if (!origin) return false;
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || origin.includes(allowed));
}

export function apiGuard(req: VercelRequest, res: VercelResponse): boolean {
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
    const referer = req.headers.referer || '';
    const source = origin || referer;

    // Allow server-side / non-browser requests in development
    if (!source && process.env.NODE_ENV === 'development') {
        return true;
    }

    // Validate origin
    if (!isOriginAllowed(source)) {
        console.warn(`[API Guard] Blocked request from: ${source || '(no origin)'}`);
        res.status(403).json({ error: 'Forbidden — request origin not allowed' });
        return false;
    }

    // Set CORS headers for allowed origins
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    return true;
}

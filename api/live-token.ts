import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_apiGuard';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!withCors(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    // Return the API key for Live API WebSocket connection
    // This is served at runtime (not baked into the JS bundle)
    return res.status(200).json({ apiKey });
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Inline origin guard (Vercel bundles each API route independently) ──
function isOriginAllowed(origin: string): boolean {
    if (!origin) return true;
    if (origin.endsWith('.vercel.app')) return true;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && origin.includes(vercelUrl)) return true;
    return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
    }

    const origin = req.headers.origin || '';
    if (!isOriginAllowed(origin)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiUrl = process.env.PMS_API_URL;
    const apiKey = process.env.PMS_API_KEY;
    const hotelId = process.env.PMS_HOTEL_ID;

    if (!apiUrl || !apiKey || !hotelId) {
        return res.status(500).json({ error: 'PMS not configured on server' });
    }

    try {
        const { action, date } = req.body;

        if (action === 'arrivals') {
            if (!date) {
                return res.status(400).json({ error: 'Missing date parameter' });
            }

            const response = await fetch(
                `${apiUrl}/hotels/${hotelId}/arrivals?date=${date}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                return res.status(response.status).json({
                    error: `PMS API error: ${response.status} ${response.statusText}`,
                });
            }

            const data = await response.json();
            return res.status(200).json(data);

        } else if (action === 'ping') {
            const response = await fetch(
                `${apiUrl}/hotels/${hotelId}/ping`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return res.status(200).json({
                success: response.ok,
                message: response.ok ? 'Connected to PMS successfully!' : `API returned status ${response.status}`,
            });

        } else {
            return res.status(400).json({ error: `Unknown action: ${action}` });
        }
    } catch (error: any) {
        console.error('[PMS Proxy] Error:', error);
        return res.status(502).json({ error: 'PMS proxy error', details: error.message });
    }
}

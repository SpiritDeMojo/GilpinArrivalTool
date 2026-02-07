import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiGuard } from './_apiGuard';

/**
 * PMS API Proxy — keeps PMS credentials server-side only.
 * 
 * Client sends: POST /api/pms-proxy { action: 'arrivals' | 'ping', date?: string }
 * Server makes the real PMS API call with the secret key and returns the response.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!apiGuard(req, res)) return;

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

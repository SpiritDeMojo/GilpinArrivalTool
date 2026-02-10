import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SentimentSchema, validateAIResponse } from '../lib/aiSchemas';

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    try {
        const { guests } = req.body;
        if (!guests || !Array.isArray(guests)) {
            return res.status(400).json({ error: 'Missing guests array in request body' });
        }

        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const guestData = guests.map((g: any, i: number) =>
            `[${i}] ${g.name} (Room ${g.room}): "${g.notes}" | Strategy: "${g.preferences}"`
        ).join('\n');

        // Retry loop — 3 attempts with exponential backoff (2s → 4s → 8s)
        let retries = 3;
        let delay = 2000;

        while (retries > 0) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: `Analyze these hotel guest notes and generate actionable tags for each:\n\n${guestData}`,
                    config: {
                        systemInstruction: `You are a luxury hotel intelligence system. Analyze each guest's notes and preferences. Generate 1-3 concise, actionable tags per guest from this list:
- "Quiet Room Required" — if noise complaints or quiet preferences mentioned
- "Allergy Alert" — if any food allergies or dietary needs present
- "VIP Treatment" — if VIP, celebrity, or high-profile indicators found
- "Special Occasion" — if birthday, anniversary, honeymoon mentioned
- "Accessibility Need" — if mobility, disability, or access requirements noted
- "Billing Alert" — if payment issues, vouchers, or balance due mentioned
- "Returning Guest" — if stay history or loyalty indicators found
- "Pet Friendly" — if dogs, pets mentioned
- "Dietary Restriction" — if vegetarian, vegan, GF, etc.
- "Late Arrival" — if very late ETA or after-hours check-in
Only tag what is clearly supported by the text. Return empty tags array if nothing notable.`,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    guestIndex: { type: Type.NUMBER },
                                    tags: {
                                        type: Type.ARRAY,
                                        items: { type: Type.STRING },
                                    },
                                },
                                required: ['guestIndex', 'tags'],
                            },
                        },
                    },
                });

                const text = response.text || '';
                const data = validateAIResponse(SentimentSchema, text);
                return res.status(200).json(data);
            } catch (error: any) {
                const isTransient = error.status === 503 || error.status === 429 || error.message?.toLowerCase().includes('overloaded');
                if (retries > 1 && isTransient) {
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
                    continue;
                }
                console.error("[API Sentiment] Error:", error);
                return res.status(502).json({ error: 'AI service error', details: error.message });
            }
        }
        return res.status(502).json({ error: 'AI service exhausted retries' });
    } catch (error: any) {
        console.error("API Route Error:", error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
}

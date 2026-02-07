import type { VercelRequest, VercelResponse } from '@vercel/node';
import { apiGuard } from './_apiGuard';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!apiGuard(req, res)) return;

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
        const clean = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        return res.status(200).json(JSON.parse(clean || '[]'));
    } catch (error: any) {
        console.error("[API Sentiment] Error:", error);
        return res.status(502).json({ error: 'AI service error', details: error.message });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

        const guestSummary = guests.map((g: any) =>
            `Room ${g.room}: ${g.name} | ETA: ${g.eta || 'Unknown'} | VIP: ${g.prefillNotes?.includes('VIP') || g.rawHtml?.includes('VIP') ? 'Yes' : 'No'} | HK Status: ${g.hkStatus || 'pending'} | Rate: ${g.rateCode || 'Standard'}`
        ).join('\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: `Here are today's arrivals at a luxury hotel:\n\n${guestSummary}\n\nWhich 5 rooms should Housekeeping clean FIRST? Consider: earliest ETAs, VIP guests, and operational efficiency.`,
            config: {
                systemInstruction: 'You are a luxury hotel operations expert. Analyze the arrivals and suggest the optimal cleaning order. Be concise but justify each choice.',
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        roomOrder: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                        },
                        reasoning: { type: Type.STRING },
                    },
                    required: ['roomOrder', 'reasoning'],
                },
            },
        });

        const text = response.text || '';
        const clean = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        return res.status(200).json(JSON.parse(clean || '{}'));
    } catch (error: any) {
        console.error("[API Cleaning Order] Error:", error);
        return res.status(502).json({ error: 'AI service error', details: error.message });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from './_apiGuard';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!withCors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    try {
        const { sessions } = req.body;
        if (!sessions || !Array.isArray(sessions)) {
            return res.status(400).json({ error: 'Missing sessions array in request body' });
        }

        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const modelName = 'gemini-2.0-flash';

        const systemInstruction = `**ROLE:** Gilpin Strategic Data Analyst.
**MISSION:** Synthesize all arrival manifests into high-level business intelligence.

**CHART SCHEMA REQUIREMENTS (MANDATORY):**
1. **strategicMix**: Array of EXACTLY 3 objects. 
   - NAMES: 'Strategic (VIP)', 'Return Guests', 'New Arrivals'.
   - If no guests fit a category, return value 0. Do NOT omit categories.
2. **occupancyPulse**: Array of {date, count} for EVERY manifest date provided.
3. **riskAnalysis**: Array of EXACTLY 4 objects.
   - NAMES: 'Allergies', 'Previous Issues', 'Billing Alerts', 'TBD Logistics'.
   - Count occurrences of ⚠️, 🚩, 💰, and "TBD" in notes. Return 0 if none found.

**METRICS:**
- loyaltyRate: Integer percentage of guests with "Yes" in L&L.
- vipIntensity: Integer percentage of VIP guests.
- strategicInsights: 2 punchy tactical sentences focusing on the current manifest property mix.

**OUTPUT:** Pure JSON. No markdown backticks.`;

        const summaryPayload = sessions.map((s: any) => {
            return `DATE: ${s.label} (${s.dateObj})
GUESTS:
${s.guests.map((g: any) => `- ${g.name} | Rm: ${g.room} | LL: ${g.ll} | Nts: ${g.prefillNotes}`).join('\n')}`;
        }).join('\n\n---\n\n');

        let retries = 3;
        let delay = 2000;

        while (retries > 0) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: `Analyze this portfolio and populate the dashboard:\n\n${summaryPayload}`,
                    config: {
                        systemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                strategicMix: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } },
                                        required: ["name", "value"]
                                    }
                                },
                                occupancyPulse: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { date: { type: Type.STRING }, count: { type: Type.NUMBER } },
                                        required: ["date", "count"]
                                    }
                                },
                                riskAnalysis: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } },
                                        required: ["name", "value"]
                                    }
                                },
                                strategicInsights: { type: Type.STRING },
                                loyaltyRate: { type: Type.NUMBER },
                                vipIntensity: { type: Type.NUMBER }
                            },
                            required: ["strategicMix", "occupancyPulse", "riskAnalysis", "strategicInsights", "loyaltyRate", "vipIntensity"]
                        }
                    }
                });

                const text = response.text || "";
                const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanJson || "null");
                return res.status(200).json(parsed ? { ...parsed, lastUpdated: Date.now() } : null);
            } catch (error: any) {
                const isTransient = error.status === 503 || error.status === 429 || error.message?.toLowerCase().includes('overloaded');
                if (retries > 1 && isTransient) {
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
                    continue;
                }
                console.error("Analytics AI Error:", error);
                return res.status(502).json({ error: 'AI service error', details: error.message });
            }
        }
        return res.status(502).json({ error: 'AI service exhausted retries' });
    } catch (error: any) {
        console.error("API Route Error:", error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ── Inline origin guard (Vercel bundles each API route independently) ──
const ALLOWED_PROJECT = 'gilpin-arrival-tool';
function isOriginAllowed(origin: string): boolean {
    if (!origin) return true; // same-origin (no Origin header)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    if (origin.endsWith('.vercel.app') && origin.includes(ALLOWED_PROJECT)) return true;
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && origin.includes(vercelUrl)) return true;
    return false;
}

export const config = { maxDuration: 90 };

/* ────────────── Types ────────────── */
interface EventItem { time: string; activity: string; }
interface DayBlock { title: string; subtitle: string; events: EventItem[]; }

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(204).end();
    }

    const origin = req.headers.origin || '';
    if (!isOriginAllowed(origin)) return res.status(403).json({ error: 'Forbidden' });
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    try {
        const {
            guestName, roomName, duration, arrivalDate, pax,
            facilities, occasions, champagneInRoom, petalsInRoom,
            preferences, history, currentItinerary,
        } = req.body;

        if (!currentItinerary || !Array.isArray(currentItinerary)) {
            return res.status(400).json({ error: 'Missing currentItinerary array' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `**ROLE:** You are the Gilpin Hotel & Lake House's luxury concierge writer.
You are given a guest's itinerary (day blocks with time+activity) and their booking context.
Your job is to REWRITE each activity description in warm, evocative, 5-star luxury language.

### VENUE KNOWLEDGE (use these facts accurately):
- **Source** — Our Michelin-starred, four-rosette restaurant. A celebration of Cumbrian produce and seasonal flavours.
- **Spice** / **Gilpin Spice** — Our acclaimed two-rosette Pan-Asian fusion restaurant, set within the heart of the Lake District.
- **Jetty Spa** — Our tranquil lakeside spa sanctuary. All spa treatments, massages, facials, and wellness experiences take place here.
- **Lake House** — Our exclusive Lake House retreat, home to Afternoon Tea and private dining.
- **Bento Box** — A freshly prepared Bento Box lunch, served to your suite or the Jetty Spa.
- **Windermere Lake Cruise** — Schedule on a quieter day (NOT the arrival day).

### RULES:
1. **REWRITE ONLY** — keep the same number of days, same number of events per day, same times. Only change the activity text.
2. **CRITICAL: CHARACTER LIMIT** — each activity description MUST be 120 characters or fewer. This is essential to prevent the printed itinerary from breaking its layout borders. Count carefully. If a description would exceed 120 characters, shorten it.
3. **Keep it concise** — each activity should be ONE sentence max. Evoke luxury without being verbose. Brevity IS luxury.
4. **Personalise** — weave in the guest's name naturally where appropriate (not on every line).
5. **Occasions** — if there's a birthday, anniversary, honeymoon, etc., reflect this warmth in tone.
6. **Champagne/Petals** — if flagged, mention in the arrival description: "A chilled bottle of Champagne" or "fresh rose petals".
7. **Returning guests** — if history indicates return, add warmth: "Welcome back to Gilpin" on the arrival event.
8. **Subtitles** — you may refine the day subtitle to be more evocative (e.g., "Indulge & Restore" instead of "Relax & Explore").
9. **DO NOT add or remove events.** The structure must remain identical.
10. **Sign off the final departure event** with warmth: "We look forward to welcoming you back to Gilpin."
11. **Keep times EXACTLY as given** — do not modify any time values.
12. **Arrival Day Ordering** — Preserve the logical guest-experience sequence on Day 1: Check-in → Welcome Card → Champagne → Petals → Dinner/Facilities. This is intentional — the guest reads the card first, then opens the champagne.

### CONTEXT:
- Guest: ${guestName || 'Guest'}
- Room: ${roomName || 'Suite'}
- Duration: ${duration || '2'} nights
- Pax: ${pax || 2}
- Arrival: ${arrivalDate || 'TBC'}
- Occasions: ${occasions || 'None'}
- Champagne in room: ${champagneInRoom ? 'Yes' : 'No'}
- Petals in room: ${petalsInRoom ? 'Yes' : 'No'}
- Guest preferences: ${preferences || 'None'}
- History: ${history || 'First visit'}
- Facilities: ${facilities || 'None'}

Return the rewritten itinerary as a JSON array of day blocks.`;

        const itineraryPayload = JSON.stringify(currentItinerary);

        let retries = 2;
        let delay = 2000;

        while (retries > 0) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: `Here is the current itinerary to rewrite:\n${itineraryPayload}`,
                    config: {
                        systemInstruction,
                        temperature: 0.7,
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    subtitle: { type: Type.STRING },
                                    events: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                time: { type: Type.STRING },
                                                activity: { type: Type.STRING },
                                            },
                                            required: ['time', 'activity'],
                                        },
                                    },
                                },
                                required: ['title', 'subtitle', 'events'],
                            },
                        },
                    },
                });

                const text = response.text || '';
                const clean = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
                const data = JSON.parse(clean || '[]');

                if (!Array.isArray(data)) throw new Error('Response is not an array');
                return res.status(200).json(data);
            } catch (error: unknown) {
                const err = error as Record<string, any>;
                const msg = err?.message?.toLowerCase?.() || '';
                const isTransient = err?.status === 503 || err?.status === 429 || msg.includes('overloaded');
                if (retries > 1 && isTransient) {
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
                    continue;
                }
                console.error('Gemini Itinerary Error:', error);
                return res.status(502).json({ error: 'AI service error', details: err?.message || 'Unknown' });
            }
        }
        return res.status(502).json({ error: 'AI service exhausted retries' });
    } catch (error: unknown) {
        console.error('API Route Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Server error', details: message });
    }
}

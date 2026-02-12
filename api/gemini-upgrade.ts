import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ── Inline origin guard (Vercel bundles each API route independently) ──
const ALLOWED_PROJECT = 'gilpin-arrival-tool';
function isOriginAllowed(origin: string): boolean {
    if (!origin) return true;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    if (origin.endsWith('.vercel.app') && origin.includes(ALLOWED_PROJECT)) return true;
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
        const { guests, emptyRooms } = req.body;
        if (!guests || !Array.isArray(guests)) {
            return res.status(400).json({ error: 'Missing guests array in request body' });
        }

        const ai = new GoogleGenAI({ apiKey });
        const modelName = 'gemini-2.0-flash';

        const systemInstruction = `**ROLE:** Gilpin Room Upgrade Strategist.
**MISSION:** Suggest strategic complimentary room upgrades. The purpose is to FREE UP cheaper rooms for potential last-minute bookings while rewarding deserving guests. The guest is UNAWARE of the strategic motive — they simply receive a complimentary upgrade as a gesture of goodwill.

**ROOM TYPE HIERARCHY (lowest → highest):**
MAIN HOTEL:
  Classic (Rooms 5, 10) → Master (Rooms 1-4, 6-7) → Junior Suite (Rooms 8-9, 11-14) → Garden Room (Rooms 15-20) → Spa Lodge (Rooms 21-25) → Spa Suite (Rooms 26-28, 30-31)

LAKE HOUSE:
  LH Classic (Room 53) → LH Master (Rooms 52, 54-56) → LH Suite (Room 51) / LH Spa Suite (Rooms 57-58)

**STRICT RULES:**
1. **ONE TIER UP ONLY** — never skip categories (e.g. Classic → Master is valid, Classic → Junior Suite is NOT)
2. Only suggest upgrades to rooms that appear in the AVAILABLE EMPTY ROOMS list
3. Never cross between Main Hotel and Lake House properties
4. Never downgrade — only upgrade
5. Maximum 5 suggestions per batch
6. Be conservative — only suggest upgrades that genuinely make strategic sense

**UPGRADE CRITERIA (in priority order):**
1. **Returning guests** (L&L = "Yes") — reward loyalty with a comp upgrade
2. **Celebrations** — anniversaries, birthdays, honeymoons mentioned in notes
3. **VIP guests** — important, high-profile, or special guests
4. **Long stays** (3+ nights) — reward commitment
5. **High pax in small room** — practical upgrade for comfort

**IMPORTANT:** Each guest entry includes their current room type. Each empty room entry includes its room type. Only suggest moves where the empty room is EXACTLY one tier above the guest's current room type.

**OUTPUT:** Return a JSON array of upgrade suggestions.`;

        const guestsPayload = guests.map((g: any) => {
            const type = g.roomType || 'Unknown';
            return `Room ${g.room} (Type: ${type}) | ${g.name} | L&L: ${g.ll} | Duration: ${g.duration} | Notes: ${g.notes || 'None'} | Preferences: ${g.preferences || 'None'}`;
        }).join('\n');

        const emptyPayload = emptyRooms.map((r: any) => {
            const type = r.roomType || 'Unknown';
            const prop = r.property === 'lake' ? 'Lake House' : 'Main Hotel';
            return `Room ${r.number} ${r.name} (Type: ${type}) — ${prop}`;
        }).join('\n');

        let retries = 3;
        let delay = 2000;

        while (retries > 0) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: `Analyze these guests and suggest complimentary upgrades: \n\nCURRENT GUESTS: \n${guestsPayload} \n\nAVAILABLE EMPTY ROOMS: \n${emptyPayload} `,
                    config: {
                        systemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    guestName: { type: Type.STRING },
                                    currentRoom: { type: Type.STRING },
                                    suggestedRoom: { type: Type.NUMBER },
                                    suggestedRoomName: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    priority: { type: Type.STRING },
                                },
                                required: ["guestName", "currentRoom", "suggestedRoom", "suggestedRoomName", "reason", "priority"]
                            }
                        }
                    }
                });

                const text = response.text || "";
                const clean = text
                    .replace(/^```json\s */, '')
                    .replace(/\s*```$/, '')
                    .trim();
                const data = JSON.parse(clean || '[]');
                return res.status(200).json(data);
            } catch (error: unknown) {
                const err = error as Record<string, any>;
                const msg = err?.message?.toLowerCase?.() || '';
                const isTransient = err?.status === 503 || err?.status === 429 || msg.includes('overloaded') || msg.includes('resource_exhausted');
                if (retries > 1 && isTransient) {
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
                    continue;
                }
                console.error("Upgrade AI Error:", error);
                return res.status(502).json({ error: 'AI service error', details: err?.message || 'Unknown error' });
            }
        }
        return res.status(502).json({ error: 'AI service exhausted retries' });
    } catch (error: unknown) {
        console.error("API Route Error:", error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'Server error', details: message });
    }
}

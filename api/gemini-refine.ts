import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// ── Inline origin guard (Vercel bundles each API route independently) ──
const ALLOWED_PROJECT = 'gilpin-arrival-tool';
function isOriginAllowed(origin: string): boolean {
    if (!origin) return true; // same-origin (no Origin header)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    // Only allow our specific Vercel project deployments, not all .vercel.app
    if (origin.endsWith('.vercel.app') && origin.includes(ALLOWED_PROJECT)) return true;
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && origin.includes(vercelUrl)) return true;
    return false;
}

// Extend serverless function timeout (Vercel default is 10s, AI audit can take 30-60s)
export const config = { maxDuration: 60 };

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

        const ai = new GoogleGenAI({ apiKey });
        const modelName = 'gemini-3-flash-preview';

        const systemInstruction = `**ROLE:** Gilpin Hotel Senior Receptionist (AI Audit v9.0).

### 🏆 GOLDEN RULE
**ENRICH, NEVER REDUCE.** Every field you return MUST contain AT LEAST as much information as the parser already extracted. If PARSER_FACILITIES has data, your output facilities MUST contain that same data (reformatted if needed). If the parser found a car reg, keep it. Add intelligence on top — never strip it away.

### 🚫 ANTI-FABRICATION
* If a data point is NOT in the raw text, return **""** for that field.
* **Car:** Return "" if no UK plate found. Internal codes (JS, SL, MAG, GRP) are NOT plates.
* **History:** Return "No" unless text has "Been Before: Yes", "_Stayed", "_Regular", or "Previous Stays".
* **Facilities:** If PARSER_FACILITIES is provided and looks correct, USE IT AS-IS. Only rebuild from RAW text if parser output is garbled (fragmented numbers/broken dates).
* **In-Room Items:** Build on parser's inRoomItems — enhance, don't discard.

### 📊 COUNT RULE
Return EXACTLY one result per guest, same order, same count. Never skip a guest.

### 📐 PRE-PARSED FIELDS (use for accuracy)
* **adults/children/infants** → include "👶 N child(ren)" in notes AND hkNotes if children/infants > 0
* **preRegistered** → "✅ Pre-Registered Online" in notes
* **bookingSource** → "📲 [OTA]" in notes if OTA
* **smokingPreference** → "🚬 [Pref]" in hkNotes
* **inRoomItems** → base list to enhance

### 1. facilities (The Itinerary)
* **IF PARSER_FACILITIES is provided and NOT garbled → RETURN IT UNCHANGED.**
* Only if garbled or empty, rebuild from RAW text using format:
  \`{Icon} {Name} (DD/MM @ HH:MM)\` joined by " • "
* Icons: 🌶️ Spice, 🍽️ Source/Dinner, 🍰 Tea/Lake House, 🍱 Bento, 💆 Spa/ESPA/Massage, ♨️ Hamper, 🎁 Hamper
* Preserve ALL dates as DD/MM or DD/MM/YY.

### 2. notes (Intelligence String)
* **CRITICAL:** This is the heart of the audit. ALWAYS ADD, NEVER REMOVE.
* Concatenate with " • " in this hierarchy:
  1. **Status:** ✅ PAID IN FULL (APR/ADV) / ⭐ VIP / 🔵 STAFF / 🟢 COMP
  2. **Pre-Reg:** ✅ Pre-Registered Online
  3. **Alerts:** ⚠️ [Allergy+Details] / 💰 [Billing] / 🤫 COMP UPGRADE (Secret)
  4. **Room:** 🟠 NO BREAKFAST / 👤 SINGLE / 👶 Children
  5. **Occasions:** 🎉 Birthday / 🥂 Anniversary / 💒 Honeymoon (include NAME and AGE if known)
  6. **Requests:** 📌 [Special requests: feather pillows, room choice, etc.]
  7. **History:** 📜 Prev: [dates]
  8. **Assets:** 🎁 [Champagne, Flowers, Balloons]
  9. **Source:** 📲 [OTA Name] if applicable

### 3. inRoomItems (Physical Checklist)
* Physical items going to room: Champagne, Ice Bucket, Dog Bed, Robes, Cot, Balloons, Itinerary, etc.
* **START with parser's inRoomItems, ADD anything from notes/billing text.**
* If children > 0 and cot/bed mentioned, include here.
* If package requires items (MINIMOON→Champagne+Itinerary, MAGESC→Champagne+Itinerary, CEL→Champagne+Balloons) and they're MISSING, add "⚠️ MISSING: [Item]" to both inRoomItems AND notes.

### 4. hkNotes (Housekeeping)
* All allergies & dietary (mirror from notes)
* Pet requirements: "🐕 Dog Bed + Bowls"
* Room setup: Extra Pillows, Feather-Free, etc.
* Smoking pref, children setup, accessibility needs.

### 5. preferences (Greeting Strategy)
* Short, punchy, 3-4 bullet points for front desk.
* Returning guest → "Welcome back!"
* Occasion → "Wish Happy [Occasion] to [Name]."
* Late arrival (ETA>18:00) → "Late arrival — expedite check-in."
* Package context: MINIMOON/MAGESC mention itinerary, DBB confirm dinner, RO offer dinner reservation.
* Pet → "Dog supplies confirmed."
* Allergy → "Confirm dietary with kitchen."

### 6. packages (Human-Readable Package Name)
* BB/BB_1/BB_2/BB_3 → "Bed & Breakfast"
* LHBB → "Bed & Breakfast (Lake House)"
* RO → "Room Only"
* DBB → "Dinner, Bed & Breakfast"
* MINIMOON/MINI → "🌙 Mini Moon"
* MAGESC/MAG_ESC → "✨ Magical Escape"
* CEL/CELEB → "🎉 Celebration"
* COMP → "🎁 Complimentary"
* Codes with WIN → "❄️ Winter Offer"
* APR/ADV/LHAPR → "💳 Advanced Purchase"
* POB/STAFF → "Pride of Britain Staff"
* LHMAG → "✨ Magical Escape (Lake House)"

### 7. roomType
* Translate 2-letter codes: CR→"Classic Room", MR→"Master Room", JS→"Junior Suite", GR→"Garden Room", GS→"Garden Suite", SL→"Spa Lodge", SS→"Spa Suite", MAG→"Maglona Suite", MOT→"Motor Lodge", LHC→"Lake House Classic", LHM→"Lake House Master", LHS→"Lake House Suite", LHSS→"Lake House Spa Suite"
* If already human-readable, keep as-is.

### 8. history (Loyalty)
* "Yes (x[Count])", "Yes", or "No". Never fabricate.

### 9. car (Registration Plate)
* If PARSER_CAR has a value, USE IT. Only fill if you spot a plate the parser missed.
* UK formats: AB12 CDE, A123 BCD, M88 HCT. Strip leading *.

### OUTPUT
* Raw JSON array. No markdown wrapping.
* One object per guest, same order.
* Empty string "" for any field not found — never fabricate.
`;

        const guestDataPayload = guests.map((g: any, i: number) => {
            let structured = `--- GUEST ${i + 1} ---\nNAME: ${g.name} | RATE: ${g.rateCode || 'Standard'}`;
            if (g.adults !== undefined) structured += ` | ADULTS: ${g.adults}`;
            if (g.children) structured += ` | CHILDREN: ${g.children}`;
            if (g.infants) structured += ` | INFANTS: ${g.infants}`;
            if (g.preRegistered) structured += ` | PRE-REGISTERED: Yes`;
            if (g.bookingSource) structured += ` | SOURCE: ${g.bookingSource}`;
            if (g.smokingPreference) structured += ` | SMOKING: ${g.smokingPreference}`;
            if (g.billingMethod) structured += ` | BILLING: ${g.billingMethod}`;
            if (g.inRoomItems) structured += `\nIN-ROOM ITEMS (Parser): ${g.inRoomItems}`;
            if (g.car) structured += `\nPARSER_CAR: ${g.car}`;
            if (g.facilities) structured += `\nPARSER_FACILITIES: ${g.facilities}`;
            if (g.facilitiesRaw) structured += `\nPARSER_FACILITIES_RAW: ${g.facilitiesRaw}`;
            if (g.dinnerTime) structured += `\nPARSER_DINNER_TIME: ${g.dinnerTime}`;
            if (g.dinnerVenue) structured += `\nPARSER_DINNER_VENUE: ${g.dinnerVenue}`;
            structured += `\nRAW: ${g.rawHtml}`;
            return structured;
        }).join("\n\n");

        let retries = 3;
        let delay = 2000;

        while (retries > 0) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: guestDataPayload,
                    config: {
                        systemInstruction,
                        temperature: 0.1,
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    notes: { type: Type.STRING },
                                    facilities: { type: Type.STRING },
                                    inRoomItems: { type: Type.STRING },
                                    preferences: { type: Type.STRING },
                                    packages: { type: Type.STRING },
                                    history: { type: Type.STRING },
                                    car: { type: Type.STRING },
                                    hkNotes: { type: Type.STRING },
                                    roomType: { type: Type.STRING }
                                },
                                required: ["notes", "facilities", "inRoomItems", "preferences", "packages", "history", "car", "hkNotes", "roomType"]
                            }
                        }
                    }
                });

                const text = response.text || "";
                const clean = text
                    .replace(/^```json\s*/, '')
                    .replace(/\s*```$/, '')
                    .trim();
                const data = JSON.parse(clean || '[]');
                if (!Array.isArray(data)) {
                    throw new Error('AI response is not an array');
                }
                // Validate result count against input guest count
                const expectedCount = guests.length;
                if (data.length !== expectedCount) {
                    console.warn(`[gemini-refine] Result count mismatch: expected ${expectedCount}, got ${data.length}`);
                }
                res.setHeader('X-Result-Count', String(data.length));
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
                console.error("Gemini Refine Error:", error);
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

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
        const modelName = 'gemini-2.0-flash';

        const systemInstruction = `**ROLE:** Gilpin Hotel Senior Receptionist (AI Audit v7.0).
**MISSION:** Extract EVERY operational detail. If a detail is in the text, it MUST appear in the output. Do not summarize away important nuances.

### 0. 📊 STRUCTURED DATA (Pre-Parsed by System)
Each guest may include pre-parsed structured fields alongside rawHtml. USE THESE for accuracy:
* **adults/children/infants** — Room occupancy (e.g. adults:2, children:1 → include "👶 1 child" in notes AND hkNotes for cot/extra bed setup)
* **preRegistered** — If true, include "✅ Pre-Registered Online" in notes
* **bookingSource** — Agent/OTA (e.g. "Booking.com", "Direct") — include in notes if OTA
* **smokingPreference** — If present, include "🚬 [Preference]" in hkNotes
* **billingMethod** — Payment method (e.g. "Pay Own Account")
* **inRoomItems** — Parser-extracted in-room items (enhance, don't discard)

### 1. 🛡️ REVENUE & SECURITY GUARD
* **APR / LHAPR:** IF RateCode has 'APR'/'ADV' -> Start 'notes' with: "✅ PAID IN FULL (Extras Only)".
* **Billing Alerts:** IF text has "Voucher", "Deposit Taken", "Balance Due" -> Add "💰 [Details]" to 'notes'.
* **Silent Upgrades:** IF text has "Guest Unaware"/"Secret" -> Add "🤫 COMP UPGRADE (Silent)" to 'notes'.

### 2. 🎁 PACKAGE & AMENITY AUDIT
* **MINIMOON:** Audit for: Champagne, Itinerary, Cruise Tickets.
* **MAGESC:** Audit for: Champagne, Itinerary.
* **CEL:** Audit for: Champagne, Balloons.
* **RULE:** If a package *requires* an item but it is NOT in the raw text, add: "⚠️ MISSING: [Item]" to 'inRoomItems' AND 'notes'.

### 3. 📝 FIELD GENERATION RULES

**A. facilities (The Itinerary)**
* **FORMAT:** \`{Icon} {Name}: {Count} ({Date} @ {Time})\`
* **ICONS:** 🌶️ Spice, 🍽️ Source, 🍰 Tea/Lake House, 🍱 Bento, 💆 Spa/Massage.
* **LOGIC:** Merge duplicates. Keep specific notes (e.g. "Couples Massage").

**B. notes (The "Intelligence String")**
* **CRITICAL:** Preserve specific details (Names, severity, specific requests).
* **HIERARCHY (Concatenate with " • "):**
    1.  **Status:** ✅ PAID / ⭐ VIP / 🔵 STAFF / 🟢 COMP
    2.  **Pre-Reg:** ✅ Pre-Registered Online (if preRegistered=true)
    3.  **Alerts:** ⚠️ [Allergies + Details] (e.g. "Nut Allergy (Carries Epipen)") / 💰 [Billing] / 🤫 [Silent]
    4.  **Room:** 🟠 NO BREAKFAST / 👤 SINGLE / 👥 3+ GUESTS / 👶 Children/Infants
    5.  **Occasions:** 🎉 [Birthday - Name/Age] / 🥂 Anniversary / 💒 Honeymoon
    6.  **Requests & Logistics:** 📌 [Any special request: "Spa Hamper", "Feather Pillows", "Dinner in Garden Room", "Specific Room Requested"]
    7.  **History:** 📜 Prev: [Dates if listed]
    8.  **ASSETS:** 🎁 [Champagne, Flowers, Balloons, Tickets, Hampers]
    9.  **Source:** If bookingSource is an OTA (Booking.com, Expedia), add "📲 [OTA Name]"
* **Example:** "✅ PAID IN FULL • ✅ Pre-Registered Online • ⚠️ Nut Allergy (Carries Epipen) • 👶 1 child • 🎉 Birthday (Rob - 50th) • 📌 Spa Hamper, Garden Room Req • 🎁 Champagne"

**C. inRoomItems (Physical Checklist)**
* **GOAL:** Physical list for Housekeeping/Bar.
* **INCLUDE:** Anything physical going into the room. (Champagne, Ice Bucket, Glasses, Dog Bed, Robes, Spa Hamper, Balloons, Itinerary, Cot, Extra Bed).
* **RULE:** If it is in 'notes' as an asset, it MUST also be here.
* **RULE:** If children/infants > 0 and cot/extra bed mentioned, include in this list.
* **RULE:** Use the parser's inRoomItems field as a base — enhance with AI analysis, don't discard.

**C1. hkNotes (Housekeeping Intelligence)**
* **GOAL:** Housekeeping-specific notes for room preparation.
* **INCLUDE:** All allergies & dietary restrictions (e.g. "⚠️ Nut Allergy (Epipen)"), any pet requirements ("🐕 Dog Bed + Bowls"), special room setup ("Extra Pillows", "Feather-Free"), smoking preference ("🚬 Non-Smoking"), children/infant setup ("👶 Cot Required").
* **RULE:** If an allergy/dietary item appears in 'notes', it MUST also appear in 'hkNotes'.
* **RULE:** If children > 0, include child-related setup notes.

**D. preferences (Greeting Strategy)**
* **STYLE:** Short, punchy, imperative instructions. (e.g. "Wish Happy Birthday to Rob. Check Voucher.")
* **RULE:** If preRegistered, add "Pre-registered — fast check-in."

**E. packages (Human Readable)**
* **CRITICAL:** Match the exact RateCode format. Underscores matter!
* **MAPPINGS:**
    * BB / BB_1 / BB_2 / BB_3 / BB1 / BB2 / BB3 -> "Bed & Breakfast"
    * LHBB / LHBB_1 / LHBB_2 / LHBB_3 / LHBB1 / LHBB2 / LHBB3 -> "Bed & Breakfast (Lake House)"
    * RO / RO_1 / RO_2 -> "Room Only"
    * DBB / DBB_1 / DBB_2 -> "Dinner, Bed & Breakfast"
    * MINI / MINIMOON / MINI_MOON -> "🌙 Mini Moon"
    * MAGESC / MAG_ESC -> "✨ Magical Escape"
    * CEL / CELEB -> "🎉 Celebration"
    * COMP -> "🎁 Complimentary"
    * BB_1_WIN / BB_2_WIN / BB_3_WIN / BB1_WIN / BB2_WIN / BB3_WIN -> "❄️ Winter Offer"
    * POB_STAFF / POB / STAFF -> "Pride of Britain Staff"
    * LHMAG -> "✨ Magical Escape (Lake House)"
    * APR / ADV / ADVANCE / LHAPR -> "💳 Advanced Purchase"
* **IMPORTANT:** "BB_2" is NOT "Winter Offer". Only codes containing "WIN" in the name are Winter Offers.
* **DEFAULT:** Use Rate Description if no code matches.

**F. history (Loyalty Tracker)**
* **FORMAT:** "Yes (x[Count])", "Yes", or "No".

**G. car (Vehicle Registration)**
* **GOAL:** Extract the guest's vehicle registration / number plate from the raw text.
* **UK FORMATS:** New (AB12 CDE), Prefix (A123 BCD, M88 HCT), Numeric (30 BHJ), Short (LN75).
* **RULES:** Strip any leading * characters (PMS marker). Return empty string "" if no plate found. Do NOT return internal codes (JS, SL, MAG, GRP, etc.).

### 4. OUTPUT REQUIREMENTS
Return a raw JSON array of objects. No markdown.
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
                                    hkNotes: { type: Type.STRING }
                                },
                                required: ["notes", "facilities", "inRoomItems", "preferences", "packages", "history", "car", "hkNotes"]
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

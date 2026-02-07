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

        // Dynamic import to keep bundle separate
        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const modelName = 'gemini-2.0-flash';

        const systemInstruction = `**ROLE:** Gilpin Hotel Senior Receptionist (AI Audit v6.0).
**MISSION:** Extract EVERY operational detail. If a detail is in the text, it MUST appear in the output. Do not summarize away important nuances.

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
    2.  **Alerts:** ⚠️ [Allergies + Details] (e.g. "Nut Allergy (Carries Epipen)") / 💰 [Billing] / 🤫 [Silent]
    3.  **Room:** 🟠 NO BREAKFAST / 👤 SINGLE / 👥 3+ GUESTS
    4.  **Occasions:** 🎉 [Birthday - Name/Age] / 🥂 Anniversary / 💒 Honeymoon
    5.  **Requests & Logistics:** 📌 [Any special request: "Spa Hamper", "Feather Pillows", "Dinner in Garden Room", "Specific Room Requested"]
    6.  **History:** 📜 Prev: [Dates if listed]
    7.  **ASSETS:** 🎁 [Champagne, Flowers, Balloons, Tickets, Hampers]
* **Example:** "✅ PAID IN FULL • ⚠️ Nut Allergy (Carries Epipen) • 🎉 Birthday (Rob - 50th) • 📌 Spa Hamper, Garden Room Req • 🎁 Champagne"

**C. inRoomItems (Physical Checklist)**
* **GOAL:** Physical list for Housekeeping/Bar.
* **INCLUDE:** Anything physical going into the room. (Champagne, Ice Bucket, Glasses, Dog Bed, Robes, Spa Hamper, Balloons, Itinerary).
* **RULE:** If it is in 'notes' as an asset, it MUST also be here.

**D. preferences (Greeting Strategy)**
* **STYLE:** Short, punchy, imperative instructions. (e.g. "Wish Happy Birthday to Rob. Check Voucher.")

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
    * BB_1_WIN / BB_2_WIN / BB_3_WIN / BB1_WIN / BB2_WIN / BB3_WIN -> "❄️ Winter Offer"
    * POB_STAFF / POB / STAFF -> "Pride of Britain Staff"
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

        const guestDataPayload = guests.map((g: any, i: number) =>
            `--- GUEST ${i + 1} ---\nNAME: ${g.name} | RATE: ${g.rateCode || 'Standard'}\nRAW: ${g.rawHtml}`
        ).join("\n\n");

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
                                    car: { type: Type.STRING }
                                },
                                required: ["notes", "facilities", "inRoomItems", "preferences", "packages", "history", "car"]
                            }
                        }
                    }
                });

                const text = response.text || "";
                let cleanJson = text;
                if (typeof text === 'string') {
                    cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
                }
                const result = JSON.parse(cleanJson || "[]");
                return res.status(200).json(result);
            } catch (error: any) {
                const isTransient = error.status === 503 || error.status === 429 || error.message?.toLowerCase().includes('overloaded');
                if (retries > 1 && isTransient) {
                    await new Promise(r => setTimeout(r, delay));
                    retries--;
                    delay *= 2;
                    continue;
                }
                console.error("Gemini Refine Error:", error);
                return res.status(502).json({ error: 'AI service error', details: error.message });
            }
        }
        return res.status(502).json({ error: 'AI service exhausted retries' });
    } catch (error: any) {
        console.error("API Route Error:", error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
}

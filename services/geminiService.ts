import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

export class GeminiService {
  static async refineGuestBatch(
    guests: Guest[], 
    fields: RefinementField[]
  ): Promise<any[] | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-pro-preview'; 

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
* **MAPPINGS:**
    * BB / BB1 / BB2 / BB3 / LHBB / LHBB1 / LHBB2 / LHBB3 -> "Bed & Breakfast"
    * RO -> "Room Only"
    * DBB / DBB_1 -> "Dinner, Bed & Breakfast"
    * MINI / MINIMOON -> "🌙 Mini Moon"
    * MAGESC -> "✨ Magical Escape"
    * CEL -> "🎉 Celebration"
    * BB_1_WIN / BB_2_WIN / BB_3_WIN -> "❄️ Winter Offer"
    * POB_STAFF -> "Pride of Britain Staff"
    * APR / ADV -> "💳 Advanced Purchase"
* **DEFAULT:** Use Rate Description if no code matches.

**F. history (Loyalty Tracker)**
* **FORMAT:** "Yes (x[Count])", "Yes", or "No".

### 4. OUTPUT REQUIREMENTS
Return a raw JSON array of objects. No markdown.
`;

    const guestDataPayload = guests.map((g, i) => 
      `--- GUEST ${i+1} ---
NAME: ${g.name} | RATE: ${g.rateCode || 'Standard'}
RAW: ${g.rawHtml}`
    ).join("\n\n");

    let retries = 3;
    let delay = 2000;

    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: guestDataPayload,
          config: {
            systemInstruction: systemInstruction,
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
                  history: { type: Type.STRING }
                },
                required: ["notes", "facilities", "inRoomItems", "preferences", "packages", "history"]
              }
            }
          }
        });
        const text = response.text || "";
        let cleanJson = text;
        if (typeof text === 'string') {
          cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        return JSON.parse(cleanJson || "[]");
      } catch (error: any) {
        const isTransient = error.status === 503 || error.status === 429 || error.message?.toLowerCase().includes('overloaded');
        if (retries > 1 && isTransient) {
          console.warn(`Audit Service overloaded (Status ${error.status}). Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          retries--;
          delay *= 2;
          continue;
        }
        console.error("Audit AI Error:", error);
        return null;
      }
    }
    return null;
  }
}
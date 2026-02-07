import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

export class GeminiService {
  static async refineGuestBatch(
    guests: Guest[],
    fields: RefinementField[]
  ): Promise<any[] | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
      alert('AI Audit requires a Gemini API key. Please configure VITE_GEMINI_API_KEY in your .env file.');
      return null;
    }

    console.log('[AI Audit] Starting refinement for', guests.length, 'guests');

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

    const guestDataPayload = guests.map((g, i) =>
      `--- GUEST ${i + 1} ---
NAME: ${g.name} | RATE: ${g.rateCode || 'Standard'}
RAW: ${g.rawHtml}`
    ).join("\n\n");

    console.log('[AI Audit] Sending', guestDataPayload.length, 'chars to Gemini');
    console.log('[AI Audit] First guest raw data length:', guests[0]?.rawHtml?.length || 0);
    if (guests[0]?.rawHtml?.length < 50) {
      console.warn('[AI Audit] WARNING: Guest rawHtml seems too short - may not contain enough data for AI to process');
      console.log('[AI Audit] Sample rawHtml:', guests[0]?.rawHtml);
    }

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
                  history: { type: Type.STRING },
                  car: { type: Type.STRING }
                },
                required: ["notes", "facilities", "inRoomItems", "preferences", "packages", "history", "car"]
              }
            }
          }
        });
        console.log('[AI Audit] Response received, parsing...');
        const text = response.text || "";
        console.log('[AI Audit] Raw response length:', text.length);
        let cleanJson = text;
        if (typeof text === 'string') {
          cleanJson = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        }
        const result = JSON.parse(cleanJson || "[]");
        console.log('[AI Audit] Successfully parsed', result.length, 'refined guests');
        return result;
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

  /**
   * AI Smart Cleaning Order: Suggests optimal room cleaning priority
   * based on ETAs, VIP status, and current housekeeping state.
   */
  static async suggestCleaningOrder(
    guests: Guest[]
  ): Promise<{ roomOrder: string[]; reasoning: string } | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      alert('AI features require a Gemini API key. Configure VITE_GEMINI_API_KEY in your .env file.');
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    const guestSummary = guests.map(g =>
      `Room ${g.room}: ${g.name} | ETA: ${g.eta || 'Unknown'} | VIP: ${g.prefillNotes?.includes('VIP') || g.rawHtml?.includes('VIP') ? 'Yes' : 'No'} | HK Status: ${g.hkStatus || 'pending'} | Rate: ${g.rateCode || 'Standard'}`
    ).join('\n');

    try {
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
      return JSON.parse(clean || '{}');
    } catch (error) {
      console.error('[AI Cleaning Order] Error:', error);
      return null;
    }
  }

  /**
   * AI Sentiment Analysis: Auto-tag guests based on their notes/preferences
   * to surface actionable requirements.
   */
  static async analyzeNoteSentiment(
    guests: { name: string; notes: string; preferences: string; room: string }[]
  ): Promise<{ guestIndex: number; tags: string[] }[] | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      alert('AI features require a Gemini API key. Configure VITE_GEMINI_API_KEY in your .env file.');
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    const guestData = guests.map((g, i) =>
      `[${i}] ${g.name} (Room ${g.room}): "${g.notes}" | Strategy: "${g.preferences}"`
    ).join('\n');

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
      const clean = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      return JSON.parse(clean || '[]');
    } catch (error) {
      console.error('[AI Sentiment] Error:', error);
      return null;
    }
  }
}
import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

export class GeminiService {
  static async refineGuestBatch(
    guests: Guest[], 
    fields: RefinementField[]
  ): Promise<any[] | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Using user-requested model name
    const modelName = 'gemini-2.0-flash'; 

    const systemInstruction = `**ROLE:** Gilpin Hotel Senior Receptionist (AI Audit v5.2).
**MISSION:** You are the final safety net. Review raw booking data and output a perfect, "Zero-Error" arrival manifest.

### 1. 🛡️ REVENUE & SECURITY GUARD
* **APR / LHAPR:** IF RateCode has 'APR'/'ADV' -> Start 'notes' with: "✅ PAID IN FULL (Extras Only)".
* **Billing Alerts:** IF text has "Voucher", "Deposit Taken", "Balance Due" -> Add "💰 [Details]" to 'notes'.
* **Silent Upgrades:** IF text has "Guest Unaware"/"Secret" -> Add "🤫 COMP UPGRADE (Silent)" to 'notes'.

### 2. 🎁 PACKAGE AUDIT (The "Promise" Check)
* **MINIMOON:** Audit for: Champagne, Itinerary, Cruise Tickets.
* **MAGESC:** Audit for: Champagne, Itinerary.
* **CEL:** Audit for: Champagne, Balloons.
* **RULE:** If a package *requires* an item but it is NOT in the raw text, add: "⚠️ MISSING: [Item]" to 'inRoomItems'.

### 3. 📝 FIELD GENERATION RULES

**A. facilities (The Itinerary)**
* **FORMAT:** \`{Icon} {Name}: {Count} ({Date} @ {Time})\`
* **ICONS:** 🌶️ Spice, 🍽️ Source, 🍰 Tea/Lake House, 🍱 Bento, 💆 Spa/Massage.
* **LOGIC:** Merge duplicates (e.g., "Massage" x2 -> "💆 Massage for 2").

**B. notes (The "Intelligence String")**
* **HIERARCHY (Concatenate with " • "):**
    1.  **Status:** ✅ PAID / ⭐ VIP / 🔵 STAFF / 🟢 COMP
    2.  **Alerts:** ⚠️ [Allergies] / 💰 [Billing] / 🤫 [Silent]
    3.  **Room:** 🟠 NO BREAKFAST / 👤 SINGLE / 👥 3+ GUESTS
    4.  **Occasions:** 🎉 Birthday / 🥂 Anniversary / 💒 Honeymoon
    5.  **Requests:** 📌 [Feather, Twin, Cot, Quiet, No Alcohol]
    6.  **History:** 📜 Prev: [Dates if listed]
    7.  **ASSETS:** 🎁 [Champagne, Flowers, Balloons, Tickets]
* **Example:** "✅ PAID IN FULL • ⚠️ Nut Allergy • 🎉 Birthday • 🎁 Champagne, Flowers"

**C. inRoomItems (Front of House Checklist)**
* **GOAL:** Physical list for the Bar.
* **INCLUDE:** Champagne, Ice Bucket, Glasses,Types of Champange or Proseco,Types of wine, Itinerary.
* **FORMAT:** Comma-separated.

**D. preferences (Greeting Strategy)**
* **STYLE:** Short, punchy, imperative instructions. (e.g. "Wish Happy Birthday. Check Voucher.")

**E. packages (Human Readable) - REFINED**
* **GOAL:** Convert codes to beautiful names.
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
* **DEFAULT:** If no code matches, use the Rate Description found in text.

**F. history (Loyalty Tracker)**
* **FORMAT:** "Yes (x[Count])", "Yes", or "No".
* **RULE:** Do NOT list specific dates here (move them to 'notes').

### 4. OUTPUT REQUIREMENTS
Return a raw JSON array of objects. No markdown.
`;

    const guestDataPayload = guests.map((g, i) => 
      `--- GUEST ${i+1} ---
NAME: ${g.name} | RATE: ${g.rateCode || 'Standard'}
RAW: ${g.rawHtml}`
    ).join("\n\n");

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
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson || "[]");
    } catch (error) {
      console.error("Audit AI Error:", error);
      return null;
    }
  }
}

import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

export class GeminiService {
  static async refineGuestBatch(
    guests: Guest[], 
    fields: RefinementField[]
  ): Promise<any[] | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-flash-preview'; 

    const systemInstruction = `
**ROLE:** Gilpin Hotel Guest Intelligence Unit (GIU) - v4.2 Platinum.
**MISSION:** Transform raw OCR data into a precise, luxury-standard arrival manifest.

### 1. 🛑 CRITICAL AUDIT PROTOCOLS
* **Celebration Audit:**
    * IF RateCode is 'CEL_DBB_1' OR 'MAGESC' OR 'MIN': Ensure 'Champagne' & 'Itinerary' are listed.
    * IF MISSING in raw text, add "⚠️ AUDIT: Missing [Item]" to notes.
* **Safety First:**
    * Scan RAW text for "Allergies:" or "Dietary:". IF found, ADD "⚠️ [Details]" to notes.
    * IF text contains "Guest Unaware" or "Secret" -> ADD "🤫 COMP UPGRADE (Silent)" to notes.

### 2. 📝 FIELD GENERATION RULES

**A. facilities (Strict Visual Formatting)**
* **FORMAT:** \`{Icon} {Name}: {Count} ({Date} @ {Time})\`
* **ICONS:** 🌶️ (Spice), 🍽️ (Source), 🍰 (Tea/Lake House), 💆 (Spa/Treatments), 🔹 (Other).
* **LOGIC:** Merge duplicates (e.g. "💆 Massage for 2").

**B. notes (The Operational Truth - Intelligence Column)**
* **GOAL:** The single source of truth for the Greeter.
* **HIERARCHY (Concatenate with " • "):**
    1.  **Status:** ⭐ VIP / 🔵 STAFF / 🟢 COMP STAY / 🚩 PREV ISSUE
    2.  **Alerts:** ⚠️ [Allergies] / 🤫 [Silent Upgrade] / 💰 [Billing Alert]
    3.  **Room:** 🟠 NO BREAKFAST / 👤 SINGLE / 👥 3+ GUESTS
    4.  **Occasions:** 🎉 Birthday / 🥂 Anniversary / 💒 Honeymoon
    5.  **Requests:** 📌 [Feather, Twin, Cot, Quiet, etc.]
    6.  **Assets:** 🎁 [Champagne, Flowers, Chocolates, Tickets]
* **Example:** "✅ PAID • ⚠️ Nut Free • 🎉 Birthday • 🎁 Champagne, Flowers"

**C. inRoomItems (Housekeeping Checklist)**
* **GOAL:** Clean list of physical items.
* **FORMAT:** Comma-separated (e.g. "Champagne, Ice Bucket, Dog Bed").

**D. preferences (Strategy)**
* **FORMAT:** Imperative actions (e.g. "Wish Happy Birthday. Check Voucher.").

**E. history (Loyalty)**
* **FORMAT:** "Yes (x[Count])", "Yes", or "No". Do not list dates here.

### 3. OUTPUT REQUIREMENTS
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
        contents: [{ role: 'user', parts: [{ text: guestDataPayload }] }],
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

      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("AI Error:", error);
      return null;
    }
  }
}

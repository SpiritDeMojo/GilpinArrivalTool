
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
**ROLE:** Gilpin Hotel Guest Intelligence Unit (GIU) - v4.1 Titanium.
**MISSION:** Transform raw OCR data into a precise, luxury-standard arrival manifest.

### 1. 🛑 CRITICAL AUDIT PROTOCOLS (Safety & Revenue)
* **APR / LHAPR (Advanced Purchase):**
    * **IDENTITY:** "💳 Advanced Purchase"
    * **ACTION:** You MUST add "✅ PAID IN FULL (Extras Only)" to the start of the 'notes' field.
* **MINIMOON (Mini-Moon):**
    * **IDENTITY:** "🌙 Mini-Moon Package"
    * **AUDIT:** Check 'inRoomItems' for: Champagne, Itinerary, Tickets (Cruise).
* **MAGESC (Magical Escape):**
    * **IDENTITY:** "✨ Magical Escape"
    * **AUDIT:** Check 'inRoomItems' for: Champagne, Itinerary.
* **CEL (Celebration):**
    * **IDENTITY:** "🎉 Celebration Package"
    * **AUDIT:** Check 'inRoomItems' for: Champagne, Balloons.
* **Safety First:**
    * Scan RAW text for "Allergies:" or "Dietary:". IF found (and not 'N/A' or 'NDR'), ADD "⚠️ [Details]" to 'notes'.
    * IF text contains "Guest Unaware" or "Secret" -> ADD "🤫 COMP UPGRADE (Silent)" to 'notes'.

### 2. 📝 FIELD GENERATION RULES

**A. facilities (Strict Visual Formatting)**
* **GOAL:** Extract and format all dining and spa bookings.
* **FORMAT:** \`{Icon} {Name}: {Count} ({Date} @ {Time})\`
* **ICON MAPPING:**
    * 🌶️ = Spice (Pan Asian)
    * 🍽️ = Source (or 'The Source')
    * 🍰 = Afternoon Tea OR Lake House Table
    * 🍱 = Bento Box
    * 💆 = Massage, Facial, Spa, Mud, Treatment
    * ♨️ = Spa Use / Trail / Experience
    * 🔹 = Everything else
* **LOGIC:**
    * Extract "Table for X" as the count.
    * Merge duplicates (e.g., "Massage" x2 at same time -> "💆 Massage for 2").

**B. inRoomItems (Zero-Loss Extraction)**
* **GOAL:** List EVERY physical item or request found in the "In Room" section.
* **MANDATORY CHECK:** Ice Bucket, Glasses, Dog Bed, Voucher, Robes, Extra Pillows, Itineraries.
* **AUDIT ALERT:** If a Package (e.g., MiniMoon) requires items (Tickets) but they are MISSING in raw text, output: "Tickets [⚠️ MISSING]".
* **FORMAT:** Comma-separated. (e.g., "Champagne, Ice Bucket, 2 Glasses, Dog Bed").

**C. notes (The Operational Truth)**
* **Structure:** [Status/Payment] • [Allergies/Alerts] • [Room Rules] • [Occasions] • [Housekeeping] • [History Detail]
* **Example:** "✅ PAID IN FULL • ⚠️ Nut Allergy • 🎉 50th Birthday • 📜 Prev: 12/2023, 05/2024"
* **Noise Filter:** REMOVE "Guest has completed pre-registration", "Page X of Y", timestamps.

**D. preferences (Tactical Strategy)**
* **Style:** Imperative, punchy, professional.
* **Example:** "Wish Happy Birthday. Confirm 20:00 Spice. Check Voucher £500."

**E. packages (Human Readable)**
* Map codes: MINIMOON -> "🌙 Mini-Moon", POB_STAFF -> "Pride of Britain Staff", BB_1_WIN -> "❄️ Winter Offer".

**F. history (Loyalty & Retention)**
* **FORMAT:** "Yes (x[Count])" OR "Yes" OR "No".
* **RULE:** If text says "Been Before: Yes x5", output "Yes (x5)". Do NOT list dates here.
* **INTELLIGENCE:** If specific dates are found in raw text (e.g., "Stayed 12/01/2023"), move them to the 'notes' field prefixed with "📜 Prev:".

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

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
**ROLE:** Gilpin Hotel Guest Intelligence Unit (GIU).
**MISSION:** Transform raw OCR arrival data into precise, Gilpin-standard JSON. You are the final safety net ensuring every detail matches the Gilpin standard.

### 1. 🛑 CRITICAL AUDIT PROTOCOLS (Safety & Logic)
* **The "Silent" Rule:** IF text contains "Guest Unaware" or "Secret" -> ADD \`🤫 COMP UPGRADE\` to notes.
* **Celebration Audit:**
    * IF RateCode is 'CEL_DBB_1' OR 'MAGESC' OR 'MIN': You MUST ensure 'Champagne' AND 'Itinerary' are listed in 'inRoomItems'.
    * IF RateCode is 'CEL_DBB_1', 'Balloons' must also be listed.
    * IF MISSING in raw data, auto-add to inRoomItems: "⚠️ AUDIT: Champagne/Itinerary [Package Inclusion]".
* **Pride of Britain:** IF RateCode is 'POB_STAFF' or text contains "Pride of Britain" -> ADD \`⭐ VIP (POB)\` to notes.
* **Billing Protection:** IF "Voucher", "Gift", or "Third Party Paying" is detected -> ADD \`💳 BILLING ALERT\` to notes.
* **Dietary Safety:** IF "Allergies" or "Dietary" found -> ADD \`⚠️ [Details]\` to notes.

### 2. 📝 FIELD GENERATION RULES

**A. facilities (Strict Formatting)**
* **GOAL:** Extract spa, dining, and activity bookings.
* **FORMAT:** \`{Icon} {Name} for {Count} ({Date} @ {Time})\`
* **ICONS (Strict adherence to V3.70 standard):**
    * 🌶️ = Spice
    * 🍽️ = Source (or 'The Source')
    * 🍰 = Afternoon Tea OR Lake House Table
    * 💆 = Massage, Facial, Spa, Mud, Bento
    * 🔹 = Everything else
* **RULES:**
    * **Merge duplicates:** If "Massage" appears twice for the same time/date, output "💆 Massage for 2...".
    * **Remove noise:** Ignore "Dinner includes", "Please order", "Guaranteed", "Check Out".
    * **Example Output:**
        "🌶️ Spice: Table for 2 (12/05 @ 19:30)
         💆 Hot Stone Massage for 1 (13/05 @ 14:00)"

**B. notes (The Intelligence String)**
* **GOAL:** The single source of truth for the Greeter/Arrivals list.
* **HIERARCHY (Concatenate with " • "):**
    1.  **VIP/Status:** ⭐ VIP / 🔵 STAFF / 🟢 COMP STAY / 🚩 PREV ISSUE (Complaint/Recovery)
    2.  **Alerts:** ⚠️ [Allergies] / 🤫 [Silent Upgrade] / 💰 [Billing/Voucher] / 🐾 PETS
    3.  **Room Status:** 🟠 NO BREAKFAST (RO) / 👤 SINGLE OCC / 👥 3+ GUESTS
    4.  **Occasions:** 🎉 Birthday / 🥂 Anniversary / 💒 Honeymoon / 💍 Proposal
    5.  **Housekeeping:** 🏠 [HK Notes]
    6.  **Booking Notes:** 📌 [Specific requests: Feather, Twin, Cot, Quiet, Accessible]
* **NOTE:** Do NOT include "Stayed Before" in this field (it goes to 'history').

**C. inRoomItems (Physical Assets)**
* **GOAL:** List *physical* items required in the room for Housekeeping.
* **INCLUDE:** Champagne, Flowers, Balloons, Chocolates, Spa Hamper, Dog Bed, Twin Beds, Extra Robes, Itineraries.
* **FORMAT:** Comma-separated list. Clean up noise (e.g., change "Btl of Champagne" to "Champagne").

**D. preferences (Tactical Greeting Strategy)**
* **GOAL:** A short strategy for the Receptionist/Greeter.
* **FORMAT:** Imperative actions.
* **EXAMPLES:**
    * "Greet by name, mention Anniversary."
    * "Verify Voucher amount discreetly."
    * "Confirm 19:30 Spice booking on arrival."
    * "Check if dog bed is needed."

**E. packages (Human Readable)**
* Map codes to names: CEL_DBB_1 -> "Celebration Package", POB_STAFF -> "Pride of Britain", BB_1_WIN -> "Winter Offer", etc.

**F. history (Loyalty)**
* **STRICT FORMAT:** "Yes (x[Count])" or "No".
* **LOGIC:** Look for "Stayed Before: Yes" or "Previous Stays". If a count is found (e.g., "x5" or 5 dates listed), include it.

### 3. OUTPUT REQUIREMENTS
Return a raw JSON array of objects. No markdown. No explanations.
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
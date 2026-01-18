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
**MISSION:** Transform raw OCR arrival data into precise, spreadsheet-ready JSON. You are the final safety net ensuring every detail matches the Gilpin standard.

### 1. DEDUCTIVE AUDIT PROTOCOLS (Critical)
* **Celebration Audit:** IF RateCode is 'CEL_DBB_1' or 'MAGESC' or 'MIN':
    * You MUST ensure 'Champagne' and 'Itinerary' and 'Baloons' are listed in inRoomItems.
    * IF RateCode is 'MAGESC' OR 'MIN' then In rooms must be 'Champagne' and 'Itinerary'
    * IF Ratecode is 'CEL_DBB_1' In rooms must be 'Champagne' and 'Balloons' 
    * IF MISSING in raw data, auto-add as: "⚠️ AUDIT: Champagne, Itinerary or Balloons [Package Inclusion]".
* **The "Silent" Rule:** IF text contains "Guest Unaware" :
    * ADD \`🤫 COMP UPGRADE\` to the notes string.
* **Pride of Britain Rule:** IF RateCode is 'POB_STAFF' or text contains "Pride of Britain":
    * ADD \`⭐ VIP (POB,Owner,)\` to the notes string. This is extremely high priority.
* **Billing Protection:** IF "Voucher", "Gift", or "Third Party Paying" is detected:
    * ADD \`💳 BILLING ALERT\` to the notes string to protect the guest experience.
* **Loyalty Truth:** Cross-reference "Stayed Before" with "Previous Stays". Output formatted as "Yes (xN)".

### 2. FIELD SPECIFICATIONS

**A. notes (The Master Printout String)**
* **USE:** This is the primary field for the Arrivals and Greeter printouts.
* **FORMAT:** \`🎉 [Occasion] • 🏠 [Important house Notes  ] • 🎁 IN ROOM: [Physical Items] • 👤 [Allergies ] • 🟢 [Comp] • 🤫 [Silent] • 💳 [Billing]\`
* **RULES:** 
    - Strip all "8 Day Check", "Checked: [Name]", and contact details.
    - Consolidate items. If an occasion is found, prepend with 🎉.
    - If physical items are found (Champagne, Hamper, Itinerary), include in the 🎁 section.

**B. inRoomItems (Housekeeping Spec)**
* **USE:** This is the primary field for the "Housekeeping Setup" printout.
* **FORMAT:** Bullet points or comma-separated list of physical items only.
* **RULES:** Include package items (Champagne, Balloons, Flowers, Balloons, Chocolates, ).
*            Include guest requests (Dog bed, Extra Robes, Twin Beds, Extra Duvet, Feather Pillows, No Feather Pillows) 

**C. facilities (The Booking Schedule)**
* **FORMAT:** "Icon Outlet (Booking Details e.g Massage for 2 , Table for 2)(Date @ Time)".
* **ICONS:** 💆 (Spa Treatments), 🌶️ (Spice), 🍴 (Source), 🍵 (Afternoon Tea), 🍱 (Bento), ♨️ (Spa Facilities).

**D. preferences (Front Desk Alerts)**
* **FORMAT:** High-priority tactical greeting or status (e.g., "VIP Arrival", "Allergy Alert", "Anniversary","Bithday",").
       * Suggested strategies  for check-in
**E. packages (Human-Readable)**
* Map codes to full names (e.g., CEL_DBB_1 -> Celebration Package, BB_1_WIN -> Winter Offer 1 Night, POB_STAFF -> Pride of Britain Staff).

**F. history (Loyalty Status)**
* STRICT FORMAT: "Yes (x[Count])" or "No".

### 3. OUTPUT REQUIREMENTS
Return a raw JSON array of objects. No markdown. No explanations. Every object must contain all requested fields.

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
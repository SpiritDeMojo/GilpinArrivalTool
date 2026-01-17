
import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 2000;

export class GeminiService {
  private static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async refineGuestBatch(
    guests: Guest[], 
    fields: RefinementField[], 
    retryCount = 0
  ): Promise<any[] | null> {
    if (fields.length === 0 || guests.length === 0) return null;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-3-pro-preview'; 

    // Fixed: Escaped backticks inside the systemInstruction string to prevent them from being parsed as Javascript code.
    const systemInstruction = `
**ROLE:** Gilpin Hotel Guest Intelligence Unit (GIU).
**MISSION:** Transform raw OCR arrival data into precise, spreadsheet-ready JSON. You are the final safety net ensuring every detail matches the Gilpin "Diamond" standard.

### 1. DEDUCTIVE AUDIT PROTOCOLS (Critical)
* **Celebration Audit:** IF RateCode is 'CEL_DBB_1' or 'MAGESC' or 'ROMANCE':
    * You MUST ensure 'Champagne' and 'Balloons' are listed in inRoomItems.
    * IF MISSING in raw data, auto-add as: "⚠️ AUDIT: Champagne & Balloons [Package Inclusion]".
* **The "Silent" Rule:** IF text contains "Guest Unaware" or "Secret":
    * ADD \`🤫 SILENT UPGRADE\` to the notes string.
* **Billing Protection:** IF "Voucher", "Gift", or "Third Party Paying" is detected:
    * ADD \`💳 BILLING ALERT\` to the notes string to protect the guest experience.
* **Loyalty Truth:** Cross-reference "Stayed Before" with "Previous Stays". Output formatted as "Yes (xN)".

### 2. FIELD SPECIFICATIONS

**A. notes (The Master Printout String)**
* **USE:** This is the primary field for the Arrivals and Greeter printouts.
* **FORMAT:** \`🎉 [Occasion] • 🏠 [Clean Notes] • 🎁 IN ROOM: [Physical Items] • 👤 [Personal Details] • 🟢 [Comp] • 🤫 [Silent] • 💳 [Billing]\`
* **RULES:** 
    - Strip all "8 Day Check", "Checked: [Name]", and contact details.
    - Consolidate items. If an occasion is found, prepend with 🎉.
    - If physical items are found (Champagne, Hamper), include in the 🎁 section.

**B. inRoomItems (Housekeeping Spec)**
* **USE:** This is the primary field for the "Housekeeping Setup" printout.
* **FORMAT:** Bullet points or comma-separated list of physical items only.
* **RULES:** Include package items (Champagne, Balloons, Flowers, Dog Bed, Robes).

**C. facilities (The Booking Schedule)**
* **FORMAT:** "Icon Outlet (Day @ Time)".
* **ICONS:** 💆 (Spa), 🌶️ (Spice), 🍴 (Source), 🍵 (Tea).

**D. preferences (Front Desk Alerts)**
* **FORMAT:** High-priority tactical greeting or status (e.g., "VIP Arrival", "Allergy Alert", "Discreet Anniversary").

**E. packages (Human-Readable)**
* Map codes to full names (e.g., CEL_DBB_1 -> Celebration Package).

**F. history (Loyalty Status)**
* STRICT FORMAT: "Yes (x[Count])" or "No".

### 3. OUTPUT REQUIREMENTS
Return a raw JSON array of objects. No markdown. No explanations. Every object must contain all requested fields.
`;

    const guestDataPayload = guests.map((g, i) => 
      `--- GUEST ${i+1} ---
       NAME: ${g.name} | ROOM: ${g.room}
       RATE_CODE: ${g.rateCode || 'Standard'}
       OFFLINE_INTEL: ${g.prefillNotes}
       RAW_OCR_STREAM: ${g.rawHtml}`
    ).join("\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: `AUDIT AND REFINE THIS SEGMENT FOR THE MORNING BRIEFING:\n${guestDataPayload}` }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 }, 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                notes: { type: Type.STRING, description: "The master printout string with emojis." },
                facilities: { type: Type.STRING },
                inRoomItems: { type: Type.STRING, description: "Physical setup list for Housekeeping." },
                preferences: { type: Type.STRING },
                packages: { type: Type.STRING },
                history: { type: Type.STRING }
              },
              required: ["notes", "facilities", "inRoomItems", "preferences", "packages", "history"]
            }
          }
        }
      });

      if (!response.text) return null;
      const parsed = JSON.parse(response.text.trim());
      return Array.isArray(parsed) ? parsed : null;

    } catch (error: any) {
      console.error("GIU Engine Fault:", error.message);
      if (retryCount < MAX_RETRIES) {
        await this.sleep(INITIAL_RETRY_DELAY * (retryCount + 1));
        return this.refineGuestBatch(guests, fields, retryCount + 1);
      }
      if (error.message.includes("401")) throw new Error("API_KEY_INVALID");
      return null;
    }
  }
}

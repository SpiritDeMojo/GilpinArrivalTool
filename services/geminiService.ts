import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 10000; 

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

    const fieldInstructions: Record<RefinementField, string> = {
      notes: "OUTPUT: 'Notes / Occasion' column content. MISSION: Combine occasion, housekeeping specifics, and internal alerts. CRITICAL: Detect hidden booking issues (e.g., 'Noticed a SPICE DUPLICATION' or 'Source Conflict Check'). Include VIP status icons (⭐). Filter out P.O.Nr and billing email addresses. Use bullet points (•) for multiple items. NO MARKDOWN.",
      facilities: "OUTPUT: 'Facilities' column content. FORMAT: 'Icon Name (DD.MM.YY @ HHMM)'. Use: 🌶️ Spice, 🍴 Source, 💆‍♀️ ESPA, 🍱 Bento, 🍵 Afternoon Tea, ♨️ Spa. Maximum 4 items, prioritizing the most immediate bookings.",
      inRoomItems: "OUTPUT: 'Housekeeping Setup Specification'. STRICT: List only physical items for room setup (e.g., 'In-Room Spa Hamper • Bottle of Champagne • Balloons'). If 'MIN' or 'MAGESC' package detected, ensure 'Champagne • Itinerary' is specified.",
      preferences: "OUTPUT: 'Concierge Strategy' (Tactical Greeting). MISSION: Provide a 1-sentence instruction for the front-of-house team. Examples: 'Warn of the biterness in peppermint tea if ordered', 'Discreetly confirm Room 55 request', 'Confirm the 88th birthday card is present'.",
      packages: "Human-readable translation of the RateCode. (e.g., 'BB_1' -> 'Bed & Breakfast', 'MAGESC' -> 'Magical Escape').",
      history: "LOYALTY: Summarize stay count and behavior (e.g., 'Regular - 5th stay', 'New Guest')."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n    ");

    const systemInstruction = `You are the Gilpin Hotel Diamond Intelligence Engine. 
     Gilpin is a world-class 5-star Relais & Châteaux hotel. Your outputs must match the 'Arrivals List' and 'Guest Greeter' PDF samples perfectly.
     
     MISSION: Transform raw PMS traces into clean, professional, and actionable hospitality intelligence.
     
     GOLD STANDARDS:
     1. STICK TO PLAIN TEXT: Do not use bold (**) or italics (_). Use standard characters and emojis.
     2. TRACE CLEANUP: Stripping '8 Day Check', 'Checked: KW', P.O.Nr, and billing instructions is mandatory.
     3. HIDDEN INTEL: You MUST cross-reference all trace text to find system conflicts. If a guest has two Spice bookings for the same time, or mentions a 'Spa Lodge price' for a 'Spa Suite', highlight this as a 'Conflict Check'.
     4. GUEST DNA: Capture the spirit of the guest notes (e.g., 'Wife struggles with mobility', '88th Birthday', 'L is Vegan').
     5. DENSITY: Your output must be concise enough to fit in a standard table cell (7.5pt font) without excessive wrapping.
    
    Return a JSON array of objects strictly matching the input batch count.`;

    const guestDataPayload = guests.map((g, i) => 
      `GUEST #${i+1}: ${g.name} (Room: ${g.room})
      RAW_DATA: "${g.rawHtml}"
      CURRENT_PARSED_NOTES: "${g.prefillNotes}"`
    ).join("\n\n---\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `GILPIN OPERATIONAL ANALYSIS:\n\n${guestDataPayload}\n\nTARGET EXTRACTION STRATEGY:\n${activeInstructions}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 32768 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: fields.reduce((acc, f) => ({ ...acc, [f]: { type: Type.STRING } }), {}),
              required: fields
            }
          }
        }
      });

      if (!response.text) return null;
      const parsed = JSON.parse(response.text.trim());
      return Array.isArray(parsed) ? parsed : null;
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("401") || errorMessage.includes("API_KEY_INVALID")) throw new Error("API_KEY_INVALID");
      if ((errorMessage.includes("429") || errorMessage.includes("quota")) && retryCount < MAX_RETRIES) {
        await this.sleep(INITIAL_RETRY_DELAY * (retryCount + 1));
        return this.refineGuestBatch(guests, fields, retryCount + 1);
      }
      throw error;
    }
  }
}

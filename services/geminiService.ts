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
      notes: "CONCIERGE STRATEGY: Detect high-value 'hidden' context from traces: overlapping bookings (e.g. SPICE DUPLICATION), past issues (recovery stays), or specific 'Do Not Move' room requests. Strip out P.O.Nr and internal IDs. NO MARKDOWN.",
      facilities: "FORMAT: 'Icon Name (Time)'. Use: 🌶️ Spice, 🍴 Source, 💆‍♀️ ESPA, 🍱 Bento, 🍵 Afternoon Tea, ♨️ Spa. High density text for compact table cells.",
      inRoomItems: "STRICT HK SETUP: List only Champagne, Flowers, Spa Hamper, Bollinger, Prosecco, or Itinerary. For 'MIN'/'MAGESC' rate codes, ALWAYS include 'Champagne • Itinerary'.",
      preferences: "ARRIVAL TACTIC: Define how the reception team should greet them (e.g., 'Confirm the crab allergy immediately', 'Warnly mention the birthday card is in room'). Define Guest DNA.",
      packages: "Convert rate codes (BB_1, LHAPR) to readable names ('Bed & Breakfast', 'Magical Escape').",
      history: "LOYALTY SUMMARY: Precise count and behavior (e.g., 'Regular Guest - 12th Stay')."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n    ");

    const systemInstruction = `You are the Gilpin Hotel Diamond Intelligence Engine. Gilpin is a world-class 5-star Relais & Châteaux hotel.
     
     MISSION: Generate ultra-refined intelligence for the Arrivals List and Guest Greeter based on raw PMS traces.
     CONSTRAINTS:
     1. Strictly PLAIN TEXT only (no **bold**, no _italics_).
     2. Identify 'Hidden' intel: detected duplicate bookings (like SPICE DUPLICATION), trace mentions of past complaints, or specific guest layout preferences.
     3. Remove all P.O.Nr, billing traces like 'send bill to email', and system IDs.
     4. Target high-density readability for 7.5pt-8pt font table printouts.
    
    Return a JSON array of objects strictly matching the input batch count.`;

    const guestDataPayload = guests.map((g, i) => 
      `GUEST #${i+1}: ${g.name} (Room: ${g.room})\nRAW_DATA: "${g.rawHtml}"\nPRE-PARSED: "${g.prefillNotes}"`
    ).join("\n\n---\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `GILPIN DIAMOND ANALYSIS TASK:\n\n${guestDataPayload}\n\nTARGET EXTRACTIONS:\n${activeInstructions}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 24000 },
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

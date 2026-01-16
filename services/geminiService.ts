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
      notes: "CONCIERGE SUMMARY: Max 2 lines. Filter all internal noise (P.O.Nr, trace dates, system IDs). Focus on setup needs, milestones, and high-value 'hidden' intel (e.g. SPICE DUPLICATION, recovery stay). NO MARKDOWN.",
      facilities: "FORMAT: 'Icon Name (Time)'. Max 3 items. Icons: 🌶️ Spice, 🍴 Source, 💆‍♀️ ESPA, 🍱 Bento, 🍵 Afternoon Tea, ♨️ Spa. High density text.",
      inRoomItems: "STRICT HK SETUP: List only Physical items like Champagne, Flowers, Spa Hamper, Bollinger, Prosecco, or Itinerary. If package is MIN/MAGESC, ensure 'Champagne • Itinerary' is present.",
      preferences: "ARRIVAL TACTIC: A tactical tip for the greeter team based on guest DNA (e.g., 'Confirm the crab allergy immediately', 'Warmly mention the 50th birthday hamper').",
      packages: "Human-readable translation of rate codes (e.g., 'Bed & Breakfast', 'Magical Escape').",
      history: "LOYALTY SUMMARY: Precise stay count and behavior (e.g., 'Regular Guest - 12th Stay')."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n    ");

    const systemInstruction = `You are the Gilpin Hotel Diamond Intelligence Engine. 
     Gilpin is a world-class 5-star Relais & Châteaux hotel. Excellence is mandatory.
     
     MISSION: Generate ultra-refined intel for the Arrivals List. 
     MATCH OUTPUTS TO PROVIDED SAMPLES:
     1. Strictly PLAIN TEXT only (No **bold**, No _italics_).
     2. Identify 'Hidden' intel: detected duplicate bookings (e.g. SPICE DUPLICATION), past stay complaints, or specific room move bans.
     3. Remove all P.O.Nr, billing traces like 'send bill to email', and system IDs.
     4. Target high-density readability for 7.5pt-8pt font table printouts.
    
    Return a JSON array of objects strictly matching input batch count.`;

    const guestDataPayload = guests.map((g, i) => 
      `GUEST #${i+1}: ${g.name} (Room: ${g.room})\nRAW_INTEL: "${g.rawHtml}"\nEXTRACTED_NOTES: "${g.prefillNotes}"`
    ).join("\n\n---\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `RETIREVE GILPIN INTELLIGENCE:\n\n${guestDataPayload}\n\nREFINEMENT SPECS:\n${activeInstructions}`,
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

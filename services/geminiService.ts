import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField, RefinementMode } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 10000; 

export class GeminiService {
  private static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async refineGuestBatch(
    guests: Guest[], 
    fields: RefinementField[], 
    mode: RefinementMode = 'free',
    retryCount = 0
  ): Promise<any[] | null> {
    if (fields.length === 0 || guests.length === 0) return null;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
    const isDiamond = mode === 'paid';
    const modelName = isDiamond ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const fieldInstructions: Record<RefinementField, string> = {
      notes: isDiamond 
        ? "CONCIERGE STRATEGY: Max 2 lines. Scan for high-value 'hidden' context: duplicate bookings (SPICE DUPLICATION), past stay resolution (recovery), or specific room requests. CRITICAL: Never include P.O.Nr or system IDs. No markdown."
        : "Gilpin 5-star standard summary. Concisely capture setup needs and milestones. No markdown.",
      facilities: "FORMAT: 'Icon Name (Time)'. Max 3 items. Use icons: 🌶️ Spice, 🍴 Source, 💆‍♀️ ESPA, 🍱 Bento, 🍵 Afternoon Tea. Compact strings.",
      inRoomItems: "STRICT WHITESPACE LIST: Identify Champagne, Flowers, Spa Hamper, Bollinger, Prosecco, or Itinerary. If package is 'MIN' or 'MAGESC', force output 'Champagne • Itinerary'.",
      preferences: isDiamond
        ? "ARRIVAL TACTIC: Define how the team should handle them on arrival based on their DNA (e.g., 'Confirm the crab allergy immediately with the guest', 'Warmly mention the birthday card in room')."
        : "Standard preferences (Bed setup, specific milk).",
      packages: "Convert rate codes (BB_1, LHBB) to human-readable names ('Bed & Breakfast', 'Magical Escape').",
      history: "LOYALTY PROFILE: stay count and status (e.g., 'Regular Guest - 12th Stay')."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n    ");

    const systemInstruction = `You are the Gilpin Hotel Diamond Intelligence Engine. 
     Gilpin is a prestigious 5-star Relais & Châteaux hotel. Luxury standards apply.
     
     MISSION: Replicate the 'Guest Greeter' and 'Arrivals List' clarity from provided PDFs.
     OUTPUT CONSTRAINTS:
     1. Strictly PLAIN TEXT only (No **bold**, No _italics_).
     2. Remove all internal P.O.Nr and system booking IDs.
     3. Ensure high information density (7.5pt-8pt font target).
     4. Detect 'hidden' contextual issues like booking overlaps or specific 'Do Not Move' flags in traces.
     
     ${isDiamond 
      ? "DIAMOND MODE enabled: High-fidelity reasoning and behavioral DNA analysis required." 
      : "STANDARD MODE enabled: Provide factual, concise extractions."}
    
    Return a JSON array of objects strictly matching input count.`;

    const guestDataPayload = guests.map((g, i) => 
      `GUEST #${i+1}: ${g.name} (Room: ${g.room})\nRAW_INTEL: "${g.rawHtml}"\nINITIAL_PARSING: "${g.prefillNotes}"`
    ).join("\n\n---\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `GILPIN ARRIVALS REFINEMENT TASK:\n\n${guestDataPayload}\n\nREFINEMENT TARGETS:\n${activeInstructions}`,
        config: {
          systemInstruction,
          ...(isDiamond ? { thinkingConfig: { thinkingBudget: 24000 } } : {}),
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
        return this.refineGuestBatch(guests, fields, mode, retryCount + 1);
      }
      throw error;
    }
  }
}

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
        ? "Extract specific setup requirements (flowers, champagne, specific messages for cards) from all traces. Define a concise concierge strategy. NOTE: Ignore 'P.O.Nr' fields completely as they are internal IDs, not occasions."
        : "Provide a clean, luxury-standard summary of housekeeping and guest notes.",
      facilities: "Extract and list restaurant (🌶️ Spice, 🍴 Source) and spa (💆‍♀️ ESPA) bookings with times. Use a bulleted list with emojis.",
      inRoomItems: "STRICT HOUSEKEEPING SETUP: Identify items: Champagne, Flowers, Spa Hamper, Bollinger, Prosecco, Chocolates, Fruit, or Cards with messages. IMPORTANT: Minimoon (MIN) and Magical Escape (MAGESC) ALWAYS include 'Champagne • Itinerary'. Output as 'Item1 • Item2'.",
      preferences: isDiamond
        ? "GUEST DNA: Infer behavioral traits. Are they celebratory? High-profile? Returning to resolve a previous issue? Define concierge greeting strategy."
        : "List stated preferences like bed setup or dietary needs.",
      packages: "Convert rate codes like BB_1, LHBB, MIN, MAGESC into human-friendly package names.",
      history: "LOYALTY PROFILE: Summarize stay count and status (Regular vs New Guest)."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n    ");

    const systemInstruction = `You are the Gilpin Hotel Golden Standard Intelligence Engine. 
    Luxury standards apply. Accuracy is mandatory. Filter out all operational noise like 'send bill to email' or internal system IDs.
    
    ${isDiamond 
      ? "DIAMOND MODE: Conduct high-fidelity reasoning (Guest DNA) and ensure setup accuracy." 
      : "STANDARD MODE: Provide factual extractions for daily operations."}
    
    Output Format: Clean JSON array of objects strictly matching input guest count.`;

    const guestDataPayload = guests.map((g, i) => 
      `GUEST #${i+1}: ${g.name} (Room: ${g.room})\nRAW_TEXT: "${g.rawHtml}"\nCURRENT_PRESET: "${g.prefillNotes}"`
    ).join("\n\n---\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `PROCESS GUEST BATCH DATA FOR GOLDEN STANDARD:\n\n${guestDataPayload}\n\nEXTRACTION TARGETS:\n${activeInstructions}`,
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
import { GoogleGenAI, Type } from "@google/genai";
import { Guest, RefinementField } from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

export class GeminiService {
  private static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async refineGuestData(guest: Guest, fields: RefinementField[], retryCount = 0): Promise<Partial<{ notes: string, facilities: string, inRoomItems: string, preferences: string, packages: string, history: string }> | null> {
    if (fields.length === 0) return null;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const fieldInstructions: Record<RefinementField, string> = {
      notes: "NOTES: Synthesize HK Notes, Traces, and Occasions. Important: If RateCode is 'MIN', this is the MINIMOON package which requires specific flowers and champagne.",
      facilities: "FACILITIES: Cleanly list all bookings (Dinner @ Spice, Massages, etc.). Use emojis. Merge lines that were split by OCR.",
      inRoomItems: "IN-ROOM: Identify all physical items needed (Champagne, Flowers, Hampers, Specific Milk types). Cross-reference with package requirements.",
      preferences: "PREFERENCES: Deep scan traces for habits (e.g., 'Likes window table', 'Avoids nuts', 'Needs extra pillows'). Infer from stay history if they have multiple visits.",
      packages: "PACKAGES: Specifically translate RateCode (${guest.rateCode}) into the Gilpin name (e.g., 'MIN' = Minimoon, 'MAGESC' = Magical Escape).",
      history: "HISTORY: Provide a crisp summary of their loyalty (e.g., '23rd visit since 2009')."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f as RefinementField] || "").join("\n    ");

    const prompt = `Role: Luxury Hotel Intelligence Architect.
    Subject: ${guest.name} (Room ${guest.room}).
    RateCode provided: ${guest.rateCode}.
    Source Data: "${guest.rawHtml}"

    Extraction Directives:
    ${activeInstructions}

    Mandates:
    1. NEVER speculate. If data is missing, leave the field concise.
    2. Format using clear bullets or line breaks.
    3. Return valid JSON only.`;

    const properties: Record<string, any> = {};
    fields.forEach(f => {
      properties[f] = { type: Type.STRING };
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties,
            required: fields
          }
        }
      });

      return response.text ? JSON.parse(response.text) : null;
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error);
      if ((errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) && retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await this.sleep(delay);
        return this.refineGuestData(guest, fields, retryCount + 1);
      }
      throw error;
    }
  }
}
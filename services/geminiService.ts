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
    
    // Tiered model selection
    // Diamond (Paid): Pro model with reasoning capabilities
    // Standard (Free): Flash model for cost-effective speed
    const model = isDiamond ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const fieldInstructions: Record<RefinementField, string> = {
      notes: isDiamond 
        ? "Analyze all notes deeply. Identify specific 'In Room' requirements vs 'Strategy' vs 'Factual History'. Highlight mobility issues, past complaints, or specific anniversaries mentioned in the raw stream."
        : "Extract key HK and Guest notes. List birthdays and anniversaries from the text.",
      facilities: "Summarize all restaurant and spa bookings with exact times and locations (Spice, Source, ESPA).",
      inRoomItems: "IN-ROOM SETUP: Identify exactly what needs to be placed in the room (e.g., hampers, flowers, specific milk, extra towels, celebratory items). Specifically look for markers like 'In Room on Arrival:' or 'Billing:'. This is HIGH PRIORITY for housekeeping.",
      preferences: isDiamond
        ? "GUEST DNA: Infer behavioral traits. Do they value privacy? Are they high-maintenance? Did they have a previous bad experience mentioned in history? Provide a 'How to Handle' strategy summary."
        : "List stated preferences like bed configuration or room requests.",
      packages: "Turn shorthand rate codes into guest-friendly package names (e.g. BB_2 -> 2 Night B&B).",
      history: isDiamond
        ? "LOYALTY PROFILE: Summarize stay frequency and total value. Highlight if they are 'Friends of Gilpin' or returning to resolve a previous issue."
        : "Count previous stays and label as New/Return."
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n    ");

    const systemInstruction = `You are the Gilpin Hotel Diamond Intelligence Engine. 
    Gilpin is a 5-star Relais & Châteaux property. Accuracy and luxury tone are critical.
    
    ${isDiamond 
      ? "DIAMOND MODE (PREMIUM): Provide high-fidelity extraction and behavioral inference. This mode is for complex strategy development. Use full thinking capacity." 
      : "STANDARD MODE (FREE): Provide clean, factual extractions for daily operational efficiency."}
    
    Output: A clean JSON array of objects mapping to each guest in the provided batch. 
    Formatting: Professional hospitality tone. No filler.`;

    const guestDataPayload = guests.map((g, i) => 
      `GUEST #${i+1}: ${g.name} (Room: ${g.room})\nRAW_DATA: "${g.rawHtml}"\nEXISTING_NOTES: "${g.prefillNotes}"`
    ).join("\n\n---\n\n");

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: `REFINE THE FOLLOWING ${guests.length} GUESTS DATA:\n\n${guestDataPayload}\n\nTARGET EXTRACTION FIELDS:\n${activeInstructions}`,
        config: {
          systemInstruction,
          // Only enable thinking budget for Diamond mode with Pro model
          ...(isDiamond ? { thinkingConfig: { thinkingBudget: 8000 } } : {}),
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
      if (errorMessage.includes("401") || errorMessage.includes("API_KEY_INVALID")) {
        throw new Error("API_KEY_INVALID");
      }
      if ((errorMessage.includes("429") || errorMessage.includes("quota")) && retryCount < MAX_RETRIES) {
        await this.sleep(INITIAL_RETRY_DELAY * (retryCount + 1));
        return this.refineGuestBatch(guests, fields, mode, retryCount + 1);
      }
      throw error;
    }
  }
}
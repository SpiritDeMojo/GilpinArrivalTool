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
    // Using gemini-3-pro-preview for maximum 'Diamond' tier reasoning capability
    const modelName = 'gemini-3-pro-preview'; 

    const fieldInstructions: Record<RefinementField, string> = {
      notes: `
        OUTPUT: Cleaned 'Guest Notes' for the Morning Report.
        RULES:
        1. STRIP NOISE: Remove '8 Day Check', 'Checked: [Name]', 'Deposit Paid', 'Auth Taken', and all email addresses/phone numbers.
        2. AUDIT: If RateCode implies 'Celebration'/'Romance' but notes are empty, output: "⚠️ AUDIT: Package booked but no traces found."
        3. ALERTS: Flag conflicts (e.g., "Double Dinner Booking detected").
        4. VIPs: If guest is Owner/Director, prepend '⭐ VIP:'.
        5. FORMAT: Use bullet points (•) for distinct items. No Markdown.`,
        
      facilities: `
        OUTPUT: Chronological list of F&B/Spa bookings.
        FORMAT: "Icon Name (Day @ Time)". 
        ICONS: 🌶️ Spice, 🍴 Source, 💆‍♀️ Spa/ESPA, 🍱 Bento, 🍵 Tea.
        LOGIC: Combine 'Table for 2' into just the outlet name. Ignore 'Breakfast'.
        EXAMPLE: "🍴 Source (03.01 @ 19:30) • 💆‍♀️ ESPA (04.01 @ 10:00)"`,
        
      inRoomItems: `
        OUTPUT: Physical Room Prep Checklist.
        LOGIC: 
        - Extract concrete items: Champagne, Petals, Balloons, Chocolates, Flowers.
        - DEDUCTIVE FILL: If RateCode is 'CEL_DBB_1', 'CEL_DBB' or 'ROMANCE', you MUST include "Bottle of Champagne" and "Balloons" even if not in traces.
        - If 'MAGESC' (Magical Escape), ensure "Itinerary" and "Champagne" are listed.
        - If 'LHSS', acknowledge Lake House Spa Suite setup requirements.
        - IGNORE: 'Bed & Breakfast' or standard rate inclusions.`,
        
      preferences: `
        OUTPUT: 'Reception Strategy' (One sentence).
        MISSION: Give the receptionist a specific conversational hook or warning.
        EXAMPLES:
        - "Guest is a regular (5th stay); ask about their last visit in the Spa Lodge."
        - "Babymoon: Ensure unpasteurized cheeses are removed from Welcome Plate."
        - "Bill settled by Mother (Victoria Mills); do not ask for card."`,
        
      packages: `
        OUTPUT: Human-readable Package Name.
        MAP: 'CEL_DBB_1'='Celebration Package', 'MAGESC'='Magical Escape', 'LHSS'='Lake House Spa Suite', 'RO'='Room Only', 'BB_1'='Bed & Breakfast'.`,
        
      history: `
        OUTPUT: Loyalty Status.
        LOGIC: If L&L/Stayed Before data exists, provide summary.
        FORMAT: "Returning Friend (Last: Jan 2024)" or "New Guest".`
    };

    const activeInstructions = fields.map(f => fieldInstructions[f] || "").join("\n\n");

    const systemInstruction = `
      ROLE: You are the Senior Guest Experience Strategist at Gilpin Hotel.
      INPUT: Raw extracted text from PMS Arrival Reports (OCR).
      OUTPUT: A structured JSON cleaning these messy notes into a "Morning Management Briefing".

      CORE BEHAVIORS:
      1. THE "SILENT UPGRADE" RULE: If text says "Guest Unaware" or "Comp Upgrade", you MUST mark this in the 'notes' field as "🚫 (SILENT UPGRADE - DO NOT MENTION)".
      2. BILLING PROTECTION: If a note says "Mum paying" or "Voucher", mention this in 'preferences' so we don't awkwardly ask for payment.
      3. DEDUCTION: Read between the lines. If a guest asks for "Non-feather pillows", assume allergy and note it.
      4. STICK TO PLAIN TEXT: No bold, no italics. Standard characters and emojis only.
      
      Output must be a raw JSON array matching the number of input guests.`;

    const guestDataPayload = guests.map((g, i) => 
      `--- GUEST ${i+1} ---
       NAME: ${g.name} | ROOM: ${g.room}
       RATE_CODE: ${g.rateCode || 'Standard'}
       L&L_STATUS: ${g.ll || 'None'}
       RAW_INTEL_STREAM: ${g.rawHtml}`
    ).join("\n\n");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: `ANALYZE THIS BATCH:\n${guestDataPayload}\n\nEXTRACTION RULES:\n${activeInstructions}` }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          // Set thinkingBudget to max for gemini-3-pro-preview to ensure the highest quality extraction
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
      console.error("Gemini API Error:", error.message);
      const isTransient = error.message.includes("429") || error.message.includes("503");
      if (isTransient && retryCount < MAX_RETRIES) {
        await this.sleep(INITIAL_RETRY_DELAY * (retryCount + 1));
        return this.refineGuestBatch(guests, fields, retryCount + 1);
      }
      if (error.message.includes("401") || error.message.includes("API_KEY_INVALID")) throw new Error("API_KEY_INVALID");
      return null;
    }
  }
}

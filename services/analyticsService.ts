import { GoogleGenAI, Type } from "@google/genai";
import { GlobalAnalyticsData, ArrivalSession } from "../types";

export class AnalyticsService {
  static async generateGlobalAnalytics(sessions: ArrivalSession[]): Promise<GlobalAnalyticsData | null> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Pro model for superior cross-document synthesis
    const modelName = 'gemini-3-pro-preview';

    const systemInstruction = `
**ROLE:** Gilpin Strategic Data Analyst.
**MISSION:** Synthesize all arrival manifests into high-level business intelligence.

**CHART SCHEMA REQUIREMENTS (MANDATORY):**
1. **strategicMix**: Array of EXACTLY 3 objects. 
   - NAMES: 'Strategic (VIP)', 'Return Guests', 'New Arrivals'.
   - If no guests fit a category, return value 0. Do NOT omit categories.
2. **occupancyPulse**: Array of {date, count} for EVERY manifest date provided.
3. **riskAnalysis**: Array of EXACTLY 4 objects.
   - NAMES: 'Allergies', 'Previous Issues', 'Billing Alerts', 'TBD Logistics'.
   - Count occurrences of ⚠️, 🚩, 💰, and "TBD" in notes. Return 0 if none found.

**METRICS:**
- loyaltyRate: Integer percentage of guests with "Yes" in L&L.
- vipIntensity: Integer percentage of VIP guests.
- strategicInsights: 2 punchy tactical sentences.

**OUTPUT:** Pure JSON. No markdown backticks.
`;

    const summaryPayload = sessions.map(s => {
      return `DATE: ${s.label} (${s.dateObj})
GUESTS:
${s.guests.map(g => `- ${g.name} | Rm: ${g.room} | LL: ${g.ll} | Nts: ${g.prefillNotes}`).join('\n')}`;
    }).join('\n\n---\n\n');

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Analyze this portfolio and populate the dashboard:\n\n${summaryPayload}`,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strategicMix: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } },
                  required: ["name", "value"]
                }
              },
              occupancyPulse: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { date: { type: Type.STRING }, count: { type: Type.NUMBER } },
                  required: ["date", "count"]
                }
              },
              riskAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } },
                  required: ["name", "value"]
                }
              },
              strategicInsights: { type: Type.STRING },
              loyaltyRate: { type: Type.NUMBER },
              vipIntensity: { type: Type.NUMBER }
            },
            required: ["strategicMix", "occupancyPulse", "riskAnalysis", "strategicInsights", "loyaltyRate", "vipIntensity"]
          }
        }
      });

      const parsed = JSON.parse(response.text || "null");
      return parsed ? { ...parsed, lastUpdated: Date.now() } : null;
    } catch (error) {
      console.error("Analytics AI Error:", error);
      return null;
    }
  }
}
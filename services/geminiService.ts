import { Guest, RefinementField } from "../types";

export class GeminiService {
  static async refineGuestBatch(
    guests: Guest[],
    fields: RefinementField[]
  ): Promise<any[] | null> {
    console.log('[AI Audit] Starting refinement for', guests.length, 'guests');

    try {
      const response = await fetch('/api/gemini-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: guests.map(g => ({
            name: g.name,
            rateCode: g.rateCode,
            rawHtml: g.rawHtml
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 500 && err.error?.includes('not configured')) {
          alert('AI Audit requires the Gemini API key to be configured on the server.');
        } else {
          console.error('[AI Audit] Server error:', response.status, err);
        }
        return null;
      }

      const result = await response.json();
      console.log('[AI Audit] Successfully received', result.length, 'refined guests');
      return result;
    } catch (error: any) {
      console.error("Audit AI Error:", error);
      // Network error — likely running locally without Vercel
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        alert('AI features are unavailable locally. Deploy to Vercel to use AI Audit.');
      }
      return null;
    }
  }

  /**
   * AI Smart Cleaning Order: Suggests optimal room cleaning priority
   * based on ETAs, VIP status, and current housekeeping state.
   */
  static async suggestCleaningOrder(
    guests: Guest[]
  ): Promise<{ roomOrder: string[]; reasoning: string } | null> {
    try {
      const response = await fetch('/api/gemini-cleaning-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: guests.map(g => ({
            room: g.room,
            name: g.name,
            eta: g.eta,
            hkStatus: g.hkStatus,
            rateCode: g.rateCode,
            prefillNotes: g.prefillNotes,
            rawHtml: g.rawHtml
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 500 && err.error?.includes('not configured')) {
          alert('AI features require the Gemini API key to be configured on the server.');
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[AI Cleaning Order] Error:', error);
      return null;
    }
  }

  /**
   * AI Sentiment Analysis: Auto-tag guests based on their notes/preferences
   * to surface actionable requirements.
   */
  static async analyzeNoteSentiment(
    guests: { name: string; notes: string; preferences: string; room: string }[]
  ): Promise<{ guestIndex: number; tags: string[] }[] | null> {
    try {
      const response = await fetch('/api/gemini-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 500 && err.error?.includes('not configured')) {
          alert('AI features require the Gemini API key to be configured on the server.');
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[AI Sentiment] Error:', error);
      return null;
    }
  }
}
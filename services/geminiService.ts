import { Guest, RefinementField } from "../types";

// ── Shared fetch-with-retry utility ────────────────────────────────────────
// Retries on network errors and 5xx (server) responses.
// 3 attempts with exponential backoff: 1s → 2s → 4s.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Don't retry on 4xx (client errors) — only on 5xx (server/AI errors)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      // 5xx — retryable
      if (attempt < maxRetries) {
        console.warn(`[AI] Request to ${url} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return response; // Last attempt — return whatever we got
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`[AI] Network error for ${url}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries}):`, lastError.message);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
    }
  }
  throw lastError || new Error('fetchWithRetry exhausted all retries');
}

export class GeminiService {
  static async refineGuestBatch(
    guests: Guest[],
    fields: RefinementField[]
  ): Promise<any[] | null> {
    console.log('[AI Audit] Starting refinement for', guests.length, 'guests');

    try {
      const response = await fetchWithRetry('/api/gemini-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: guests.map(g => ({
            name: g.name,
            rateCode: g.rateCode,
            rawHtml: g.rawHtml,
            // Enhanced parser fields for better AI output
            adults: g.adults,
            children: g.children,
            infants: g.infants,
            preRegistered: g.preRegistered,
            bookingSource: g.bookingSource,
            smokingPreference: g.smokingPreference,
            billingMethod: g.billingMethod,
            inRoomItems: g.inRoomItems,
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
    } catch (error: unknown) {
      console.error("Audit AI Error:", error);
      // Network error — likely running locally without Vercel
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('Failed to fetch') || error instanceof TypeError) {
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
      const response = await fetchWithRetry('/api/gemini-cleaning-order', {
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
            rawHtml: g.rawHtml,
            // Enhanced fields for smarter prioritization
            children: g.children,
            infants: g.infants,
            inRoomItems: g.inRoomItems,
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
      const response = await fetchWithRetry('/api/gemini-sentiment', {
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

  /**
   * AI Room Upgrade Suggestions: Analyzes guests and available rooms
   * to suggest complimentary upgrades for returning/VIP/celebration guests.
   */
  static async suggestUpgrades(
    guests: { room: string; name: string; ll: string; duration: string; notes: string; preferences: string }[],
    emptyRooms: { number: number; name: string; property: 'main' | 'lake' }[]
  ): Promise<{ guestName: string; currentRoom: string; suggestedRoom: number; suggestedRoomName: string; reason: string; priority: string }[] | null> {
    try {
      const response = await fetchWithRetry('/api/gemini-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guests, emptyRooms })
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
      console.error('[AI Upgrade] Error:', error);
      return null;
    }
  }
}
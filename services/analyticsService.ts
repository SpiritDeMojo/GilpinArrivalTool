import { GlobalAnalyticsData, ArrivalSession } from "../types";

// ── Shared fetch-with-retry utility ────────────────────────────────────────
// Retries on network errors and 5xx (server) responses.
// 2 attempts with exponential backoff: 1s → 2s.
// NOTE: keep low to avoid stacking with server-side retries (also 2).
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      if (attempt < maxRetries) {
        console.warn(`[Analytics] Request returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      return response;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        console.warn(`[Analytics] Network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
    }
  }
  throw lastError || new Error('fetchWithRetry exhausted all retries');
}

export class AnalyticsService {
  static async generateGlobalAnalytics(sessions: ArrivalSession[]): Promise<GlobalAnalyticsData | null> {
    // Client-side 90s timeout so the UI never hangs indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetchWithRetry('/api/gemini-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sessions: sessions.map(s => ({
            label: s.label,
            dateObj: s.dateObj,
            guests: s.guests.map(g => ({
              name: g.name,
              room: g.room,
              ll: g.ll,
              prefillNotes: g.prefillNotes
            }))
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Analytics AI Error:', response.status, err);
        throw new Error(err?.error || err?.details || `Server returned ${response.status}`);
      }

      return await response.json();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('[Analytics] Request timed out after 90s');
        throw new Error('Analytics timed out. Try again with fewer sessions selected.');
      }
      console.error("Analytics AI Error:", error);
      throw error instanceof Error ? error : new Error('Unknown analytics error');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
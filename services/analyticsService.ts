import { GlobalAnalyticsData, ArrivalSession } from "../types";

export class AnalyticsService {
  static async generateGlobalAnalytics(sessions: ArrivalSession[]): Promise<GlobalAnalyticsData | null> {
    try {
      const response = await fetch('/api/gemini-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        return null;
      }

      return await response.json();
    } catch (error: any) {
      console.error("Analytics AI Error:", error);
      return null;
    }
  }
}
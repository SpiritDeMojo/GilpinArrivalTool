import { z } from 'zod';

// ── Zod Schemas for AI API Response Validation ─────────────────────────────
// These schemas validate Gemini AI responses before sending them to the
// frontend. Even though we use Gemini's responseSchema for structured output,
// the AI can still return malformed data in edge cases. Zod catches this
// server-side and returns a clean 502 instead of crashing the frontend.

// ── gemini-refine ──────────────────────────────────────────────────────────
export const RefineGuestSchema = z.array(z.object({
    notes: z.string(),
    facilities: z.string(),
    inRoomItems: z.string(),
    preferences: z.string(),
    packages: z.string(),
    history: z.string(),
    car: z.string(),
    hkNotes: z.string(),
}));
export type RefineGuestResult = z.infer<typeof RefineGuestSchema>;

// ── gemini-cleaning-order ──────────────────────────────────────────────────
export const CleaningOrderSchema = z.object({
    roomOrder: z.array(z.string()),
    reasoning: z.string(),
});
export type CleaningOrderResult = z.infer<typeof CleaningOrderSchema>;

// ── gemini-sentiment ───────────────────────────────────────────────────────
export const SentimentSchema = z.array(z.object({
    guestIndex: z.number(),
    tags: z.array(z.string()),
}));
export type SentimentResult = z.infer<typeof SentimentSchema>;

// ── gemini-analytics ───────────────────────────────────────────────────────
export const AnalyticsSchema = z.object({
    strategicMix: z.array(z.object({
        name: z.string(),
        value: z.number(),
    })),
    occupancyPulse: z.array(z.object({
        date: z.string(),
        count: z.number(),
    })),
    riskAnalysis: z.array(z.object({
        name: z.string(),
        value: z.number(),
    })),
    strategicInsights: z.string(),
    loyaltyRate: z.number(),
    vipIntensity: z.number(),
});
export type AnalyticsResult = z.infer<typeof AnalyticsSchema>;

// ── Shared validation helper ───────────────────────────────────────────────
// Parses raw text from Gemini, strips markdown fences, validates with Zod.
// Returns validated data on success, throws AIValidationError on failure.
export class AIValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AIValidationError';
    }
}

export function validateAIResponse<T>(
    schema: z.ZodType<T>,
    rawText: string,
): T {
    const clean = rawText
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

    let parsed: unknown;
    try {
        parsed = JSON.parse(clean || 'null');
    } catch (err: unknown) {
        throw new AIValidationError(
            `JSON parse failed: ${err instanceof Error ? err.message : 'unknown error'}`
        );
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
        throw new AIValidationError(
            `Schema validation failed: ${result.error.issues.map((e: z.ZodIssue) => e.message).join(', ')}`
        );
    }
    return result.data;
}


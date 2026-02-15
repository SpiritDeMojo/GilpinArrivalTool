import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * AI Review Fetcher — uses Gemini with Google Search grounding to find
 * the latest ratings and reviews for Gilpin Hotel, Source, and Spice.
 */

const SEARCH_TARGETS: Record<string, { name: string; searchQuery: string }[]> = {
    reception: [
        { name: 'hotelGoogleRating', searchQuery: 'Gilpin Hotel & Lake House Windermere Google rating' },
        { name: 'latestHotelReview', searchQuery: 'Gilpin Hotel & Lake House latest TripAdvisor review' },
    ],
    source: [
        { name: 'sourceGoogleRating', searchQuery: 'Source by Gilpin restaurant Windermere Google rating' },
        { name: 'latestSourceReview', searchQuery: 'Source by Gilpin restaurant latest review' },
    ],
    spice: [
        { name: 'spiceGoogleRating', searchQuery: 'Spice by Gilpin Windermere Google rating' },
        { name: 'latestSpiceReview', searchQuery: 'Spice by Gilpin latest review' },
    ],
    lakehouse: [
        { name: 'lhGoogleRating', searchQuery: 'Gilpin Lake House Windermere Google rating' },
        { name: 'latestLHReview', searchQuery: 'Gilpin Lake House latest review' },
    ],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { department } = req.body as { department: string };
    const targets = SEARCH_TARGETS[department];

    if (!targets || targets.length === 0) {
        return res.status(200).json({ reviews: {} });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
        const reviews: Record<string, string> = {};

        // Batch all queries into a single Gemini call with grounding
        const questionsBlock = targets.map((t, i) =>
            `${i + 1}. ${t.searchQuery}`
        ).join('\n');

        const prompt = `You are a hotel operations assistant. Search for the latest information for each query below.
For ratings, provide the current Google rating (e.g. "4.7/5 ⭐").
For reviews, provide a brief 1-2 sentence summary of the most recent review you can find, including the platform and approximate date.

Queries:
${questionsBlock}

Respond in this exact JSON format:
{
  ${targets.map(t => `"${t.name}": "your answer here"`).join(',\n  ')}
}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: [{ google_search: {} }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1024,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API error:', errText);
            return res.status(500).json({ error: 'Gemini API error', details: errText });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.text)
            ?.map((p: any) => p.text)
            ?.join('') || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                Object.assign(reviews, parsed);
            } catch {
                // If JSON parse fails, use raw text
                console.warn('Could not parse Gemini response as JSON, using raw text');
                targets.forEach(t => {
                    reviews[t.name] = text;
                });
            }
        }

        return res.status(200).json({ reviews });
    } catch (error: any) {
        console.error('Review fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch reviews', message: error.message });
    }
}

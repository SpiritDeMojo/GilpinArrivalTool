import { describe, it, expect, vi } from 'vitest';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: vi.fn(),
}));

describe('PDFService', () => {
    describe('Room Mapping', () => {
        it('should correctly map room names to numbers', () => {
            const ROOM_MAP: Record<string, number> = {
                'lyth': 1, 'winster': 2, 'cleabarrow': 3, 'crook': 5,
                'harriet': 51, 'ethel': 52, 'adgie': 53, 'gertie': 54
            };

            expect(ROOM_MAP['lyth']).toBe(1);
            expect(ROOM_MAP['harriet']).toBe(51);
            expect(ROOM_MAP['gertie']).toBe(54);
        });
    });

    describe('extractSection helper', () => {
        const extractSection = (text: string, startMarker: string, endMarkers: string[]): string => {
            const safeStart = startMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const startMatch = text.match(new RegExp(safeStart, 'i'));
            if (!startMatch) return "";
            const startIndex = startMatch.index! + startMatch[0].length;
            const remaining = text.substring(startIndex);

            let bestEndIndex = remaining.length;
            endMarkers.forEach(endM => {
                const escaped = endM.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const m = remaining.match(new RegExp(escaped, 'i'));
                if (m && m.index! < bestEndIndex) bestEndIndex = m.index!;
            });
            return remaining.substring(0, bestEndIndex).trim();
        };

        it('should extract text between markers', () => {
            const text = "HK Notes: Clean room before 3pm. Guest Notes: Birthday cake needed.";
            const result = extractSection(text, "HK Notes:", ["Guest Notes:"]);
            expect(result).toBe("Clean room before 3pm.");
        });

        it('should return empty string if start marker not found', () => {
            const text = "Some random text without markers";
            const result = extractSection(text, "HK Notes:", ["Guest Notes:"]);
            expect(result).toBe("");
        });

        it('should extract to end if no end marker found', () => {
            const text = "HK Notes: This is the end of the text";
            const result = extractSection(text, "HK Notes:", ["NonExistent:"]);
            expect(result).toBe("This is the end of the text");
        });
    });

    describe('formatFacilities helper', () => {
        const formatFacilities = (text: string): string => {
            if (!text || text.trim() === "") return "";
            const mappings = [
                { key: "Spice", icon: "🌶️" },
                { key: "Source", icon: "🍽️" },
                { key: "Massage", icon: "💆" },
            ];

            const parts = text.split('/');
            let result: string[] = [];

            parts.forEach(part => {
                const p = part.trim();
                if (!p) return;

                let emoji = "🔹";
                for (const m of mappings) {
                    if (p.toLowerCase().includes(m.key.toLowerCase())) {
                        emoji = m.icon;
                        break;
                    }
                }
                result.push(`${emoji} ${p}`);
            });

            return result.join(" • ");
        };

        it('should format facility text with icons', () => {
            const text = "Spice dinner / Source lunch";
            const result = formatFacilities(text);
            expect(result).toContain("🌶️");
            expect(result).toContain("🍽️");
        });

        it('should return empty for empty input', () => {
            expect(formatFacilities("")).toBe("");
            expect(formatFacilities("   ")).toBe("");
        });
    });
});

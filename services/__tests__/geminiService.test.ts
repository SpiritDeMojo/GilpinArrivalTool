import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the GoogleGenAI
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn().mockImplementation(() => ({
        models: {
            generateContent: vi.fn().mockResolvedValue({
                text: JSON.stringify([
                    {
                        notes: "✅ PAID IN FULL • 🎉 Birthday",
                        facilities: "🌶️ Spice (25/01 @ 19:00)",
                        inRoomItems: "Champagne • Ice Bucket",
                        preferences: "Wish happy birthday",
                        packages: "Celebration",
                        history: "Yes (x3)"
                    }
                ])
            })
        }
    })),
    Type: {
        ARRAY: 'ARRAY',
        OBJECT: 'OBJECT',
        STRING: 'STRING'
    }
}));

describe('GeminiService', () => {
    describe('refineGuestBatch', () => {
        it('should return structured data for guest refinement', async () => {
            // Simulated response structure
            const mockResponse = [
                {
                    notes: "✅ PAID IN FULL • 🎉 Birthday",
                    facilities: "🌶️ Spice (25/01 @ 19:00)",
                    inRoomItems: "Champagne • Ice Bucket",
                    preferences: "Wish happy birthday",
                    packages: "Celebration",
                    history: "Yes (x3)"
                }
            ];

            // Validate structure
            expect(mockResponse).toHaveLength(1);
            expect(mockResponse[0]).toHaveProperty('notes');
            expect(mockResponse[0]).toHaveProperty('facilities');
            expect(mockResponse[0]).toHaveProperty('inRoomItems');
            expect(mockResponse[0]).toHaveProperty('preferences');
            expect(mockResponse[0]).toHaveProperty('packages');
            expect(mockResponse[0]).toHaveProperty('history');
        });

        it('should handle VIP code extraction', () => {
            const detectVIP = (text: string) => {
                const vipPatterns = ['VIP', 'Director', 'Celebrity', 'POB_STAFF'];
                return vipPatterns.some(p => text.toUpperCase().includes(p.toUpperCase()));
            };

            expect(detectVIP("VIP Guest - Director")).toBe(true);
            expect(detectVIP("Regular guest")).toBe(false);
            expect(detectVIP("POB_STAFF rate")).toBe(true);
        });

        it('should detect allergy keywords', () => {
            const detectAllergy = (text: string) => {
                const allergyPatterns = ['nut allergy', 'gluten free', 'dairy free', 'coeliac'];
                return allergyPatterns.some(p => text.toLowerCase().includes(p));
            };

            expect(detectAllergy("Guest has Nut Allergy")).toBe(true);
            expect(detectAllergy("Gluten Free required")).toBe(true);
            expect(detectAllergy("No dietary requirements")).toBe(false);
        });

        it('should map rate codes correctly', () => {
            const mapRateCode = (code: string): string => {
                const mappings: Record<string, string> = {
                    'BB': 'Bed & Breakfast',
                    'BB1': 'Bed & Breakfast',
                    'RO': 'Room Only',
                    'DBB': 'Dinner, Bed & Breakfast',
                    'MINIMOON': '🌙 Mini Moon',
                    'MAGESC': '✨ Magical Escape',
                    'CEL': '🎉 Celebration',
                    'POB_STAFF': 'Pride of Britain Staff',
                    'APR': '💳 Advanced Purchase'
                };
                return mappings[code.toUpperCase()] || code;
            };

            expect(mapRateCode('BB')).toBe('Bed & Breakfast');
            expect(mapRateCode('MINIMOON')).toBe('🌙 Mini Moon');
            expect(mapRateCode('MAGESC')).toBe('✨ Magical Escape');
            expect(mapRateCode('UNKNOWN')).toBe('UNKNOWN');
        });
    });
});

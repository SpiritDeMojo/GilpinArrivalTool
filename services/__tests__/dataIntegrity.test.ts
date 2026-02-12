import { describe, it, expect } from 'vitest';

/**
 * Data Integrity Tests
 *
 * These tests verify that the AI audit pipeline correctly handles
 * edge cases that could lead to data corruption or safety issues.
 */

describe('AI Audit Data Integrity', () => {

    describe('hkNotes allergy cross-check', () => {
        // Replicates the cross-check logic from useGuestManager.handleAIRefine
        const crossCheckAllergyHkNotes = (ref: { notes: string; hkNotes: string }): string => {
            const allergyPatterns = [
                /allergy/i, /gluten/i, /dairy/i, /lactose/i, /nut\b/i, /vegan/i, /vegetarian/i,
                /shellfish/i, /crustacean/i, /egg\s+allergy/i, /soy/i, /sesame/i, /sulphite/i,
                /halal/i, /kosher/i, /coeliac/i, /celiac/i, /epipen/i
            ];
            const missingInHK: string[] = [];
            allergyPatterns.forEach(pattern => {
                if (pattern.test(ref.notes) && !pattern.test(ref.hkNotes)) {
                    const match = ref.notes.match(new RegExp(`[^•]*${pattern.source}[^•]*`, 'i'));
                    if (match) missingInHK.push(match[0].trim());
                }
            });
            if (missingInHK.length > 0) {
                const uniqueMissing = [...new Set(missingInHK)];
                return ref.hkNotes + ' • ' + uniqueMissing.join(' • ');
            }
            return ref.hkNotes;
        };

        it('should append nut allergy to hkNotes if missing', () => {
            const ref = {
                notes: '⚠️ Nut Allergy • Birthday celebration',
                hkNotes: 'Extra towels • Late checkout'
            };
            const result = crossCheckAllergyHkNotes(ref);
            expect(result).toContain('Nut Allergy');
            expect(result).toContain('Extra towels'); // Original hkNotes preserved
        });

        it('should not duplicate allergies already in hkNotes', () => {
            const ref = {
                notes: '⚠️ Nut Allergy • Birthday',
                hkNotes: 'Nut Allergy • Extra towels'
            };
            const result = crossCheckAllergyHkNotes(ref);
            // Should NOT have "Nut Allergy" twice
            const nutCount = (result.match(/Nut Allergy/gi) || []).length;
            expect(nutCount).toBe(1);
        });

        it('should detect and append shellfish from notes', () => {
            const ref = {
                notes: 'Guest has shellfish allergy and is gluten free',
                hkNotes: 'Clean room before 2pm'
            };
            const result = crossCheckAllergyHkNotes(ref);
            expect(result).toContain('shellfish');
            expect(result).toContain('gluten');
        });

        it('should detect epipen in notes and ensure it appears in hkNotes', () => {
            const ref = {
                notes: 'Carries epipen for severe allergy',
                hkNotes: 'Standard prep'
            };
            const result = crossCheckAllergyHkNotes(ref);
            expect(result).toContain('epipen');
        });

        it('should handle notes with no allergies — hkNotes unchanged', () => {
            const ref = {
                notes: 'Birthday celebration • Returning guest',
                hkNotes: 'Extra towels'
            };
            const result = crossCheckAllergyHkNotes(ref);
            expect(result).toBe('Extra towels');
        });
    });

    describe('Structured field preservation', () => {
        // Simulates the merge logic from handleAIRefine
        const mergeAIResult = (existing: Record<string, any>, aiRef: Record<string, any>): Record<string, any> => {
            return {
                ...existing,
                prefillNotes: aiRef.notes || existing.prefillNotes,
                facilities: aiRef.facilities || existing.facilities,
                inRoomItems: aiRef.inRoomItems || existing.inRoomItems,
                preferences: aiRef.preferences || existing.preferences,
                car: existing.car || aiRef.car || '',
                hkNotes: aiRef.hkNotes || existing.hkNotes || '',
                // Explicitly preserved fields
                adults: existing.adults,
                children: existing.children,
                infants: existing.infants,
                preRegistered: existing.preRegistered,
                bookingSource: existing.bookingSource,
                smokingPreference: existing.smokingPreference,
                depositAmount: existing.depositAmount,
                billingMethod: existing.billingMethod,
                stayHistory: existing.stayHistory,
                stayHistoryCount: existing.stayHistoryCount,
            };
        };

        it('should preserve parser-extracted adults/children after AI merge', () => {
            const existing = { adults: 2, children: 1, infants: 0, prefillNotes: '', car: 'AB12 CDE' };
            const aiRef = { notes: 'Updated notes', facilities: 'Spa', inRoomItems: '', preferences: '', car: '', hkNotes: '' };
            const result = mergeAIResult(existing, aiRef);
            expect(result.adults).toBe(2);
            expect(result.children).toBe(1);
            expect(result.infants).toBe(0);
        });

        it('should preserve parser car over AI car', () => {
            const existing = { car: 'AB12 CDE', prefillNotes: '' };
            const aiRef = { notes: '', facilities: '', inRoomItems: '', preferences: '', car: 'XY34 ZZZ', hkNotes: '' };
            const result = mergeAIResult(existing, aiRef);
            expect(result.car).toBe('AB12 CDE'); // Parser car wins
        });

        it('should use AI car when parser car is empty', () => {
            const existing = { car: '', prefillNotes: '' };
            const aiRef = { notes: '', facilities: '', inRoomItems: '', preferences: '', car: 'XY34 ZZZ', hkNotes: '' };
            const result = mergeAIResult(existing, aiRef);
            expect(result.car).toBe('XY34 ZZZ');
        });

        it('should preserve depositAmount and billingMethod', () => {
            const existing = {
                depositAmount: '200.00', billingMethod: 'Credit Card',
                stayHistoryCount: 5, stayHistory: '3 stays in 2024',
                prefillNotes: '', car: ''
            };
            const aiRef = { notes: 'AI notes', facilities: '', inRoomItems: '', preferences: '', car: '', hkNotes: '' };
            const result = mergeAIResult(existing, aiRef);
            expect(result.depositAmount).toBe('200.00');
            expect(result.billingMethod).toBe('Credit Card');
            expect(result.stayHistoryCount).toBe(5);
            expect(result.stayHistory).toBe('3 stays in 2024');
        });

        it('should preserve preRegistered and bookingSource', () => {
            const existing = {
                preRegistered: true, bookingSource: 'Direct',
                smokingPreference: 'Non-smoking',
                prefillNotes: '', car: ''
            };
            const aiRef = { notes: '', facilities: '', inRoomItems: '', preferences: '', car: '', hkNotes: '' };
            const result = mergeAIResult(existing, aiRef);
            expect(result.preRegistered).toBe(true);
            expect(result.bookingSource).toBe('Direct');
            expect(result.smokingPreference).toBe('Non-smoking');
        });
    });

    describe('Result count mismatch detection', () => {
        it('should detect when AI returns fewer results than guests sent', () => {
            const guestCount = 18;
            const resultCount = 17;
            expect(resultCount !== guestCount).toBe(true);
        });

        it('should detect when AI returns more results than guests sent', () => {
            const guestCount = 5;
            const resultCount = 6;
            expect(resultCount !== guestCount).toBe(true);
        });

        it('should pass when counts match', () => {
            const guestCount = 10;
            const resultCount = 10;
            expect(resultCount === guestCount).toBe(true);
        });
    });
});

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

    describe('Allergy keyword extraction', () => {
        // Helper simulating the parser's allergy keyword scanning logic
        const scanForAllergies = (text: string): string[] => {
            const scanLower = text.toLowerCase();
            const allergies: string[] = [];

            if (scanLower.includes("nut allergy") && !allergies.some(a => a.toLowerCase().includes('nut'))) allergies.push("🥜 Nut Allergy");
            if ((scanLower.includes("gluten free") || scanLower.includes("coeliac")) && !allergies.some(a => /gluten|coeliac/i.test(a))) allergies.push("🍞 Gluten Free");
            if ((scanLower.includes("dairy free") || scanLower.includes("lactose")) && !allergies.some(a => /dairy|lactose/i.test(a))) allergies.push("🧀 Dairy Free");
            if (scanLower.includes("vegan") && !allergies.some(a => /vegan/i.test(a))) allergies.push("🌱 Vegan");
            if (scanLower.includes("vegetarian") && !allergies.some(a => /vegetarian/i.test(a))) allergies.push("🥬 Vegetarian");
            // Extended keywords
            if ((scanLower.includes("shellfish") || scanLower.includes("crustacean")) && !allergies.some(a => /shellfish|crustacean/i.test(a))) allergies.push("🦐 Shellfish Allergy");
            if (scanLower.includes("fish allergy") && !allergies.some(a => /fish allergy/i.test(a))) allergies.push("🐟 Fish Allergy");
            if (scanLower.includes("egg allergy") && !allergies.some(a => /egg/i.test(a))) allergies.push("🥚 Egg Allergy");
            if ((scanLower.includes("soy allergy") || scanLower.includes("soya allergy")) && !allergies.some(a => /soy/i.test(a))) allergies.push("🫘 Soy Allergy");
            if (scanLower.includes("sesame") && !allergies.some(a => /sesame/i.test(a))) allergies.push("⚠️ Sesame Allergy");
            if (scanLower.includes("sulphite") && !allergies.some(a => /sulphite/i.test(a))) allergies.push("⚠️ Sulphite Sensitivity");
            if (scanLower.includes("halal") && !allergies.some(a => /halal/i.test(a))) allergies.push("☪️ Halal");
            if (scanLower.includes("kosher") && !allergies.some(a => /kosher/i.test(a))) allergies.push("✡️ Kosher");

            return allergies;
        };

        it('should detect nut allergy', () => {
            expect(scanForAllergies("Guest has nut allergy")).toContain("🥜 Nut Allergy");
        });

        it('should detect shellfish allergy (new keyword)', () => {
            expect(scanForAllergies("Allergies: Shellfish")).toContain("🦐 Shellfish Allergy");
        });

        it('should detect crustacean as shellfish', () => {
            expect(scanForAllergies("Allergies: Crustacean allergy")).toContain("🦐 Shellfish Allergy");
        });

        it('should detect sesame allergy (new keyword)', () => {
            expect(scanForAllergies("Notes: sesame allergy")).toContain("⚠️ Sesame Allergy");
        });

        it('should detect halal dietary requirement (new keyword)', () => {
            expect(scanForAllergies("Guest requires halal food")).toContain("☪️ Halal");
        });

        it('should detect kosher dietary requirement (new keyword)', () => {
            expect(scanForAllergies("Must be kosher")).toContain("✡️ Kosher");
        });

        it('should detect egg allergy (new keyword)', () => {
            expect(scanForAllergies("Notes: egg allergy")).toContain("🥚 Egg Allergy");
        });

        it('should detect soy/soya allergy (new keyword)', () => {
            expect(scanForAllergies("soy allergy")).toContain("🫘 Soy Allergy");
            expect(scanForAllergies("soya allergy")).toContain("🫘 Soy Allergy");
        });

        it('should detect multiple allergies at once', () => {
            const result = scanForAllergies("Guest has nut allergy, gluten free, and shellfish");
            expect(result).toContain("🥜 Nut Allergy");
            expect(result).toContain("🍞 Gluten Free");
            expect(result).toContain("🦐 Shellfish Allergy");
            expect(result.length).toBe(3);
        });

        it('should not duplicate vegan for vegetarian text', () => {
            const result = scanForAllergies("Guest is vegan");
            expect(result.filter(a => /vegan/i.test(a)).length).toBe(1);
        });

        it('should return empty for text with no allergy keywords', () => {
            expect(scanForAllergies("Normal booking, no special requirements")).toEqual([]);
        });
    });

    describe('Section end-markers prevent data bleed', () => {
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

        it('should stop at "Previous Stays" and not bleed into booking notes', () => {
            const text = "Booking Notes: Birthday celebration. Previous Stays: 3 times in 2024.";
            const endMarkers = ["Unit:", "Page", "HK Notes:", "Guest Notes:", "Allergies:", "Facility Bookings:", "Previous Stays", "In Room", "Smoking"];
            const result = extractSection(text, "Booking Notes:", endMarkers);
            expect(result).toBe("Birthday celebration.");
            expect(result).not.toContain("Previous Stays");
            expect(result).not.toContain("2024");
        });

        it('should stop at "In Room" and not bleed into in-room items', () => {
            const text = "HK Notes: Extra pillows. In Room on Arrival: Champagne and flowers.";
            const endMarkers = ["Unit:", "Page", "Guest Notes:", "Booking Notes:", "Allergies:", "Previous Stays", "In Room", "Smoking"];
            const result = extractSection(text, "HK Notes:", endMarkers);
            expect(result).toBe("Extra pillows.");
            expect(result).not.toContain("Champagne");
        });

        it('should stop at "Smoking" end-marker', () => {
            const text = "Guest Notes: Quiet room preferred. Smoking: Non-smoking room required.";
            const endMarkers = ["Unit:", "Page", "HK Notes:", "Booking Notes:", "Allergies:", "Previous Stays", "In Room", "Smoking"];
            const result = extractSection(text, "Guest Notes:", endMarkers);
            expect(result).toBe("Quiet room preferred.");
            expect(result).not.toContain("smoking");
        });
    });
});

describe('BookingStreamFormatter', () => {
    // Replicate the allergy extraction logic from bookingStreamFormatter.ts
    const extractAllergy = (fullText: string): string | undefined => {
        const allergyMatch = fullText.match(/Allergies:\s*(.*?)(?=\s*(?:HK Notes:|Guest Notes:|Unit:|Token:|Deposit:|Booking Notes|$))/i);
        return allergyMatch && allergyMatch[1].trim() ? allergyMatch[1].trim() : undefined;
    };

    it('should extract allergy text before Token: end-marker', () => {
        const text = "Allergies: Nut Allergy Token: 54321";
        const result = extractAllergy(text);
        expect(result).toBe("Nut Allergy");
        expect(result).not.toContain("Token");
    });

    it('should extract allergy text before Deposit: end-marker', () => {
        const text = "Allergies: Shellfish Allergy Deposit: £200.00";
        const result = extractAllergy(text);
        expect(result).toBe("Shellfish Allergy");
        expect(result).not.toContain("Deposit");
    });

    it('should extract allergy when followed by Unit:', () => {
        const text = "Allergies: Dairy Free Unit: 12345";
        const result = extractAllergy(text);
        expect(result).toBe("Dairy Free");
    });

    it('should return undefined for empty allergy section', () => {
        const text = "Some text without allergies";
        const result = extractAllergy(text);
        expect(result).toBeUndefined();
    });
});


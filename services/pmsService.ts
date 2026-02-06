import { Guest, HKStatus, MaintenanceStatus, GuestStatus } from '../types';

// ============================================
// PMS API Configuration
// ============================================

interface PMSConfig {
    apiUrl: string;
    apiKey: string;
    hotelId: string;
    refreshInterval: number;
}

/**
 * Generic PMS reservation data structure
 * This will be mapped from various PMS systems
 */
export interface PMSReservation {
    reservationId: string;
    guestName: string;
    roomNumber: string;
    roomType: string;
    arrivalDate: string;
    arrivalTime: string;
    departureDate: string;
    stayNights: number;
    rateCode: string;
    rateName: string;
    adults: number;
    children: number;
    vehicleInfo?: string;
    transportMethod?: string;
    specialRequests?: string;
    allergies?: string[];
    dietaryRequirements?: string[];
    previousStays: number;
    vipLevel?: string;
    membershipTier?: string;
    amenities?: string[];
    packages?: string[];
    notes?: string;
    email?: string;
    phone?: string;
    status: 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out';
}

/**
 * PMS API response structure
 */
interface PMSArrivalsResponse {
    success: boolean;
    data: {
        arrivals: PMSReservation[];
        date: string;
        totalCount: number;
    };
    error?: string;
}

// ============================================
// Configuration Helper
// ============================================

function getPMSConfig(): PMSConfig {
    return {
        apiUrl: import.meta.env.VITE_PMS_API_URL || '',
        apiKey: import.meta.env.VITE_PMS_API_KEY || '',
        hotelId: import.meta.env.VITE_PMS_HOTEL_ID || '',
        refreshInterval: parseInt(import.meta.env.VITE_PMS_REFRESH_INTERVAL || '60000', 10),
    };
}

/**
 * Check if PMS is configured with required credentials
 */
export function isPMSConfigured(): boolean {
    const config = getPMSConfig();
    return !!(config.apiUrl && config.apiKey && config.hotelId);
}

/**
 * Get the configured refresh interval
 */
export function getRefreshInterval(): number {
    return getPMSConfig().refreshInterval;
}

// ============================================
// Data Transformation
// ============================================

/**
 * Transform PMS reservation to Guest format
 * This preserves compatibility with existing app functionality
 */
export function transformPMSToGuest(pmsData: PMSReservation): Guest {
    // Extract VIP/special flags
    const isVIP = pmsData.vipLevel ? true : false;
    const isReturn = pmsData.previousStays > 0;
    const hasAllergies = pmsData.allergies && pmsData.allergies.length > 0;

    // Build facilities string from amenities/packages
    const facilities = [
        ...(pmsData.amenities || []),
        ...(pmsData.packages || []),
    ].join(', ');

    // Build preferences from special requests and dietary requirements
    const preferences = [
        pmsData.specialRequests,
        pmsData.dietaryRequirements?.join(', '),
        pmsData.vipLevel ? `VIP Level: ${pmsData.vipLevel}` : '',
    ].filter(Boolean).join(' | ');

    // Build in-room items from amenities
    const inRoomItems = (pmsData.amenities || [])
        .filter(a => a.toLowerCase().includes('room') || a.toLowerCase().includes('welcome'))
        .join(', ');

    // Extract prefill notes (allergies, diet, etc.)
    const prefillNotes = [
        hasAllergies ? `⚠️ ALLERGIES: ${pmsData.allergies!.join(', ')}` : '',
        pmsData.dietaryRequirements?.length ? `🍽️ DIETARY: ${pmsData.dietaryRequirements.join(', ')}` : '',
        pmsData.notes || '',
    ].filter(Boolean).join('\n');

    // Determine transport method
    const ll = pmsData.transportMethod || '';
    const car = pmsData.vehicleInfo || '';

    return {
        id: pmsData.reservationId,
        room: pmsData.roomNumber,
        name: pmsData.guestName,
        car,
        ll,
        eta: pmsData.arrivalTime || '',
        duration: `${pmsData.stayNights} night${pmsData.stayNights > 1 ? 's' : ''}`,
        facilities,
        prefillNotes,
        inRoomItems,
        preferences,
        rawHtml: '', // Not applicable for API data
        rateCode: pmsData.rateCode,
        packageName: pmsData.rateName,
        stayHistoryCount: pmsData.previousStays,
        isManual: false,
        roomType: pmsData.roomType,
        // Initialize status fields
        hkStatus: 'pending' as HKStatus,
        maintenanceStatus: 'pending' as MaintenanceStatus,
        guestStatus: mapPMSStatusToGuestStatus(pmsData.status),
        roomNotes: [],
        inRoomDelivered: false,
        courtesyCallNotes: [],
    };
}

/**
 * Map PMS reservation status to GuestStatus
 */
function mapPMSStatusToGuestStatus(pmsStatus: PMSReservation['status']): GuestStatus {
    switch (pmsStatus) {
        case 'checked_in':
            return 'checked_in';
        case 'confirmed':
        case 'pending':
            return 'pre_arrival';
        default:
            return 'pre_arrival';
    }
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch arrivals from PMS for a specific date
 */
export async function fetchArrivals(date: Date): Promise<Guest[]> {
    const config = getPMSConfig();

    if (!isPMSConfigured()) {
        console.warn('PMS not configured. Use PDF import instead.');
        return [];
    }

    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        const response = await fetch(
            `${config.apiUrl}/hotels/${config.hotelId}/arrivals?date=${dateStr}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`PMS API error: ${response.status} ${response.statusText}`);
        }

        const data: PMSArrivalsResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Unknown PMS error');
        }

        // Transform PMS data to Guest format
        return data.data.arrivals.map(transformPMSToGuest);
    } catch (error) {
        console.error('Failed to fetch arrivals from PMS:', error);
        throw error;
    }
}

/**
 * Test PMS API connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
    const config = getPMSConfig();

    if (!isPMSConfigured()) {
        return { success: false, message: 'PMS not configured. Add API credentials to .env file.' };
    }

    try {
        const response = await fetch(
            `${config.apiUrl}/hotels/${config.hotelId}/ping`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.ok) {
            return { success: true, message: 'Connected to PMS successfully!' };
        } else {
            return { success: false, message: `API returned status ${response.status}` };
        }
    } catch (error) {
        return { success: false, message: `Connection failed: ${error}` };
    }
}

// ============================================
// Mock Data for Development
// ============================================

/**
 * Generate mock PMS arrivals for testing without real API
 */
export function getMockArrivals(date: Date): Guest[] {
    const dateStr = date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    console.log(`[PMS Mock] Generating mock arrivals for ${dateStr}`);

    const mockReservations: PMSReservation[] = [
        {
            reservationId: 'PMS-001',
            guestName: 'Mr & Mrs Harrison',
            roomNumber: '1 OAKDALE',
            roomType: 'Deluxe Lake Suite',
            arrivalDate: date.toISOString(),
            arrivalTime: '14:00',
            departureDate: new Date(date.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            stayNights: 3,
            rateCode: 'RACK',
            rateName: 'Best Available Rate',
            adults: 2,
            children: 0,
            vehicleInfo: 'BMW X5 - AB12 CDE',
            transportMethod: 'Own Car',
            specialRequests: 'Anniversary celebration, prefer quiet room',
            previousStays: 5,
            vipLevel: 'Gold',
            amenities: ['Welcome champagne', 'Fresh flowers', 'Spa robe'],
            packages: ['Romantic Escape Package'],
            status: 'confirmed',
        },
        {
            reservationId: 'PMS-002',
            guestName: 'Dr Smith',
            roomNumber: '3 CLEABARROW',
            roomType: 'Garden Room',
            arrivalDate: date.toISOString(),
            arrivalTime: '16:30',
            departureDate: new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            stayNights: 2,
            rateCode: 'BB',
            rateName: 'Bed & Breakfast',
            adults: 1,
            children: 0,
            allergies: ['Nuts', 'Shellfish'],
            dietaryRequirements: ['Vegetarian'],
            previousStays: 0,
            status: 'confirmed',
        },
        {
            reservationId: 'PMS-003',
            guestName: 'The Johnson Family',
            roomNumber: '12 BRANT FELL',
            roomType: 'Family Suite',
            arrivalDate: date.toISOString(),
            arrivalTime: '15:00',
            departureDate: new Date(date.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            stayNights: 4,
            rateCode: 'FAM',
            rateName: 'Family Package',
            adults: 2,
            children: 2,
            transportMethod: 'Taxi from station',
            previousStays: 2,
            amenities: ['Kids welcome pack', 'Extra towels'],
            status: 'confirmed',
        },
    ];

    return mockReservations.map(transformPMSToGuest);
}

/**
 * Get arrivals - uses real API if configured, otherwise mock data
 */
export async function getArrivals(date: Date, useMock: boolean = false): Promise<Guest[]> {
    if (useMock || !isPMSConfigured()) {
        return getMockArrivals(date);
    }

    return fetchArrivals(date);
}

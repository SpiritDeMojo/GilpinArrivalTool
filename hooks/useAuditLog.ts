import { useCallback } from 'react';
import { Guest, AuditEntry } from '../types';

/**
 * Hook that wraps guest update functions to automatically append audit log entries.
 * Compares old and new values, creating timestamped records of every change.
 */
export const useAuditLog = (
    guests: Guest[],
    updateGuest: (id: string, updates: Partial<Guest>) => void
) => {
    /**
     * Wraps an updateGuest call with automatic audit logging.
     * Detects which fields changed by comparing old vs new values.
     */
    const auditedUpdate = useCallback((
        guestId: string,
        updates: Partial<Guest>,
        performedBy: string = 'User'
    ) => {
        const guest = guests.find(g => g.id === guestId);
        if (!guest) {
            updateGuest(guestId, updates);
            return;
        }

        const newEntries: AuditEntry[] = [];
        const trackedFields: (keyof Guest)[] = [
            'hkStatus', 'maintenanceStatus', 'guestStatus', 'room',
            'inRoomDelivered', 'name', 'eta', 'car', 'facilities',
            'preferences', 'prefillNotes'
        ];

        for (const field of trackedFields) {
            if (field in updates && updates[field] !== guest[field]) {
                const oldVal = guest[field];
                const newVal = updates[field];

                newEntries.push({
                    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    timestamp: Date.now(),
                    action: getActionLabel(field, newVal),
                    field,
                    oldValue: oldVal != null ? String(oldVal) : undefined,
                    newValue: String(newVal),
                    performedBy,
                });
            }
        }

        // Also detect room note additions
        if (updates.roomNotes && guest.roomNotes) {
            const newNotes = updates.roomNotes.length - guest.roomNotes.length;
            if (newNotes > 0) {
                const latestNote = updates.roomNotes[updates.roomNotes.length - 1];
                newEntries.push({
                    id: `audit_${Date.now()}_note`,
                    timestamp: Date.now(),
                    action: `Added room note: "${latestNote.message.substring(0, 50)}"`,
                    field: 'roomNotes',
                    newValue: latestNote.message,
                    performedBy: latestNote.author || performedBy,
                });
            }
        }

        if (newEntries.length > 0) {
            const existingLog = guest.activityLog || [];
            updateGuest(guestId, {
                ...updates,
                activityLog: [...existingLog, ...newEntries],
            });
        } else {
            updateGuest(guestId, updates);
        }
    }, [guests, updateGuest]);

    return { auditedUpdate };
};

/**
 * Generate human-readable action labels for audit entries
 */
function getActionLabel(field: string, newValue: unknown): string {
    switch (field) {
        case 'hkStatus':
            return `Housekeeping status → ${formatStatus(String(newValue))}`;
        case 'maintenanceStatus':
            return `Maintenance status → ${formatStatus(String(newValue))}`;
        case 'guestStatus':
            return `Guest status → ${formatStatus(String(newValue))}`;
        case 'room':
            return `Room changed to ${newValue}`;
        case 'inRoomDelivered':
            return newValue ? 'In-room items delivered' : 'In-room delivery unmarked';
        case 'name':
            return `Name updated to ${newValue}`;
        case 'eta':
            return `ETA updated to ${newValue}`;
        default:
            return `${field} updated`;
    }
}

function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

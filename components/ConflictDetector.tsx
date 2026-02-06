import React, { useMemo } from 'react';
import { Guest } from '../types';

interface ConflictDetectorProps {
    guests: Guest[];
    onDismiss?: () => void;
}

interface Conflict {
    type: 'duplicate_room' | 'missing_eta' | 'missing_room';
    severity: 'error' | 'warning';
    message: string;
    guestIds: string[];
}

const ConflictDetector: React.FC<ConflictDetectorProps> = ({ guests, onDismiss }) => {
    const conflicts = useMemo(() => {
        const issues: Conflict[] = [];

        // Check for duplicate rooms
        const roomCounts = new Map<string, Guest[]>();
        guests.forEach(g => {
            const roomKey = g.room.toLowerCase().trim();
            if (roomKey && roomKey !== 'tbd' && roomKey !== 'unassigned') {
                const existing = roomCounts.get(roomKey) || [];
                existing.push(g);
                roomCounts.set(roomKey, existing);
            }
        });

        roomCounts.forEach((guestsInRoom, room) => {
            if (guestsInRoom.length > 1) {
                issues.push({
                    type: 'duplicate_room',
                    severity: 'error',
                    message: `Room "${room.toUpperCase()}" assigned to ${guestsInRoom.length} guests: ${guestsInRoom.map(g => g.name).join(', ')}`,
                    guestIds: guestsInRoom.map(g => g.id)
                });
            }
        });

        // Check for missing ETAs
        const missingETA = guests.filter(g => !g.eta || g.eta === 'N/A' || g.eta.trim() === '');
        if (missingETA.length > 0) {
            issues.push({
                type: 'missing_eta',
                severity: 'warning',
                message: `${missingETA.length} guest${missingETA.length > 1 ? 's' : ''} missing ETA: ${missingETA.slice(0, 3).map(g => g.name).join(', ')}${missingETA.length > 3 ? ` +${missingETA.length - 3} more` : ''}`,
                guestIds: missingETA.map(g => g.id)
            });
        }

        // Check for unassigned rooms
        const unassignedRoom = guests.filter(g => !g.room || g.room === 'TBD' || g.room === 'Unassigned');
        if (unassignedRoom.length > 0) {
            issues.push({
                type: 'missing_room',
                severity: 'warning',
                message: `${unassignedRoom.length} guest${unassignedRoom.length > 1 ? 's' : ''} need room assignment`,
                guestIds: unassignedRoom.map(g => g.id)
            });
        }

        return issues;
    }, [guests]);

    if (conflicts.length === 0) return null;

    const errorCount = conflicts.filter(c => c.severity === 'error').length;
    const warningCount = conflicts.filter(c => c.severity === 'warning').length;

    return (
        <div className="mb-6 space-y-2">
            {/* Summary Bar */}
            <div className="flex items-center justify-between px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-lg">
                <div className="flex items-center gap-4">
                    <span className="text-xl">⚡</span>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Data Quality Alerts
                        </span>
                        <span className="ml-3 text-[10px] text-slate-500">
                            {errorCount > 0 && <span className="text-red-500 font-bold">{errorCount} error{errorCount > 1 ? 's' : ''}</span>}
                            {errorCount > 0 && warningCount > 0 && ' • '}
                            {warningCount > 0 && <span className="text-amber-500 font-bold">{warningCount} warning{warningCount > 1 ? 's' : ''}</span>}
                        </span>
                    </div>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Individual Conflicts */}
            <div className="space-y-2">
                {conflicts.map((conflict, idx) => (
                    <div
                        key={idx}
                        className={`flex items-start gap-3 px-5 py-3 rounded-xl border backdrop-blur-lg ${conflict.severity === 'error'
                                ? 'bg-red-500/5 border-red-500/30'
                                : 'bg-amber-500/5 border-amber-500/20'
                            }`}
                    >
                        <span className="mt-0.5">
                            {conflict.severity === 'error' ? '❌' : '⚠️'}
                        </span>
                        <div className="flex-1">
                            <span className={`text-sm font-semibold ${conflict.severity === 'error'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                {conflict.type === 'duplicate_room' && 'Duplicate Room Assignment'}
                                {conflict.type === 'missing_eta' && 'Missing ETA'}
                                {conflict.type === 'missing_room' && 'Room Not Assigned'}
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {conflict.message}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ConflictDetector;

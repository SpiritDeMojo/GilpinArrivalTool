import React, { useState, useMemo } from 'react';
import { AuditEntry, RoomMove } from '../types';

interface ActivityLogPanelProps {
    guestName: string;
    activityLog: AuditEntry[];
    roomMoves?: RoomMove[];
    onClose: () => void;
}

const DEPARTMENT_COLORS: Record<string, string> = {
    housekeeping: '#3b82f6',
    maintenance: '#f59e0b',
    reception: '#10b981',
};

const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
    guestName,
    activityLog,
    roomMoves = [],
    onClose,
}) => {
    const [filterDept, setFilterDept] = useState<string>('all');

    // Merge audit entries and room moves into a single timeline
    const timeline = useMemo(() => {
        const items: Array<{
            id: string;
            timestamp: number;
            type: 'audit' | 'room_move';
            data: AuditEntry | RoomMove;
        }> = [];

        activityLog.forEach(entry => {
            // Apply department filter
            if (filterDept !== 'all') {
                const fieldToDept: Record<string, string> = {
                    hkStatus: 'housekeeping',
                    maintenanceStatus: 'maintenance',
                    guestStatus: 'reception',
                    inRoomDelivered: 'reception',
                    courtesyCallNotes: 'reception',
                };
                const dept = fieldToDept[entry.field] || 'reception';
                if (dept !== filterDept) return;
            }
            items.push({ id: entry.id, timestamp: entry.timestamp, type: 'audit', data: entry });
        });

        roomMoves.forEach(move => {
            items.push({ id: move.id, timestamp: move.timestamp, type: 'room_move', data: move });
        });

        return items.sort((a, b) => b.timestamp - a.timestamp);
    }, [activityLog, roomMoves, filterDept]);

    // Group by date
    const groupedByDate = useMemo(() => {
        const groups: Record<string, typeof timeline> = {};
        timeline.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString('en-GB', {
                weekday: 'short', day: 'numeric', month: 'short',
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(item);
        });
        return groups;
    }, [timeline]);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 9998,
                    backdropFilter: 'blur(4px)',
                }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: 'min(420px, 90vw)',
                background: 'var(--nav-bg, #fdfaf3)',
                borderLeft: '3px solid var(--gilpin-gold, #c5a065)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.15)',
                animation: 'slideInRight 0.3s ease-out',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border-ui, rgba(197,160,101,0.2))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{
                            fontSize: '8px',
                            fontWeight: 900,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.15em',
                            color: 'var(--gilpin-gold, #c5a065)',
                            marginBottom: '4px',
                        }}>Activity Log</div>
                        <div style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: 'var(--text-main)',
                        }}>{guestName}</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '1px solid var(--border-ui, rgba(197,160,101,0.2))',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >×</button>
                </div>

                {/* Department Filter */}
                <div style={{
                    padding: '12px 20px',
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                    borderBottom: '1px solid var(--border-ui, rgba(197,160,101,0.1))',
                }}>
                    {['all', 'housekeeping', 'maintenance', 'reception'].map(dept => (
                        <button
                            key={dept}
                            onClick={() => setFilterDept(dept)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '20px',
                                border: filterDept === dept ? '2px solid var(--gilpin-gold, #c5a065)' : '1px solid var(--border-ui, rgba(197,160,101,0.2))',
                                background: filterDept === dept ? 'var(--gilpin-gold, #c5a065)' : 'transparent',
                                color: filterDept === dept ? 'white' : 'var(--text-main)',
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {dept === 'all' ? '📋 All' : dept === 'housekeeping' ? '🧹 HK' : dept === 'maintenance' ? '🔧 Maint' : '🛎️ Recep'}
                        </button>
                    ))}
                </div>

                {/* Timeline */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 20px',
                }}>
                    {timeline.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: 'var(--text-muted, #94a3b8)',
                            fontSize: '13px',
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📜</div>
                            No activity recorded yet
                        </div>
                    ) : (
                        Object.entries(groupedByDate).map(([date, items]) => (
                            <div key={date} style={{ marginBottom: '20px' }}>
                                <div style={{
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.15em',
                                    color: 'var(--text-muted, #94a3b8)',
                                    marginBottom: '10px',
                                    paddingBottom: '6px',
                                    borderBottom: '1px solid var(--border-ui, rgba(197,160,101,0.1))',
                                }}>{date}</div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {items.map(item => {
                                        if (item.type === 'room_move') {
                                            const move = item.data as RoomMove;
                                            return (
                                                <div key={item.id} style={{
                                                    padding: '10px 14px',
                                                    borderRadius: '12px',
                                                    background: 'rgba(239, 68, 68, 0.08)',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    fontSize: '12px',
                                                }}>
                                                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '3px' }}>
                                                        🔄 Room Move
                                                    </div>
                                                    <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                                                        Room {move.fromRoom} → Room {move.toRoom}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '10px',
                                                        color: 'var(--text-muted, #94a3b8)',
                                                        marginTop: '4px',
                                                    }}>
                                                        {new Date(move.timestamp).toLocaleTimeString('en-GB', {
                                                            hour: '2-digit', minute: '2-digit',
                                                        })} • by {move.movedBy}
                                                        {move.reason && ` • ${move.reason}`}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const entry = item.data as AuditEntry;
                                        const fieldToDept: Record<string, string> = {
                                            hkStatus: 'housekeeping',
                                            maintenanceStatus: 'maintenance',
                                            guestStatus: 'reception',
                                            inRoomDelivered: 'reception',
                                        };
                                        const dept = fieldToDept[entry.field] || 'reception';
                                        const deptColor = DEPARTMENT_COLORS[dept] || '#64748b';

                                        return (
                                            <div key={item.id} style={{
                                                padding: '10px 14px',
                                                borderRadius: '12px',
                                                background: 'var(--surface, rgba(255,255,255,0.5))',
                                                border: '1px solid var(--border-ui, rgba(197,160,101,0.12))',
                                                fontSize: '12px',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                                    <span style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: deptColor,
                                                        flexShrink: 0,
                                                    }} />
                                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                                                        {entry.action}
                                                    </span>
                                                </div>
                                                {entry.oldValue && (
                                                    <div style={{
                                                        fontSize: '10px',
                                                        color: 'var(--text-muted, #94a3b8)',
                                                        marginTop: '2px',
                                                    }}>
                                                        was: <span style={{ textDecoration: 'line-through' }}>{entry.oldValue.replace(/_/g, ' ')}</span>
                                                    </div>
                                                )}
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: 'var(--text-muted, #94a3b8)',
                                                    marginTop: '4px',
                                                }}>
                                                    {new Date(entry.timestamp).toLocaleTimeString('en-GB', {
                                                        hour: '2-digit', minute: '2-digit',
                                                    })} • by {entry.performedBy}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer count */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border-ui, rgba(197,160,101,0.2))',
                    fontSize: '10px',
                    color: 'var(--text-muted, #94a3b8)',
                    textAlign: 'center',
                    fontWeight: 700,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.1em',
                }}>
                    {timeline.length} event{timeline.length !== 1 ? 's' : ''} tracked
                </div>
            </div>

            <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </>
    );
};

export default ActivityLogPanel;

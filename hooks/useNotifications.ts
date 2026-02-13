import { useEffect, useRef, useState, useCallback } from 'react';
import { Guest, DashboardView, HK_STATUS_INFO, MAINTENANCE_STATUS_INFO, GUEST_STATUS_INFO, isRoomReady } from '../types';

// === Notification Types ===

export interface AppNotification {
    id: string;
    type: 'hk_status' | 'maint_status' | 'guest_status' | 'room_note' | 'room_ready' | 'chat_message';
    department: 'housekeeping' | 'maintenance' | 'frontofhouse';
    room: string;
    guestName: string;
    message: string;
    emoji: string;
    color: string;
    /** Which dashboard tabs should show a badge for this notification */
    badgeTabs: DashboardView[];
    timestamp: number;
}

export interface DepartmentBadges {
    housekeeping: number;
    maintenance: number;
    frontofhouse: number;
}

// === Web Audio API Sound Generation ===

function playTone(type: 'chime' | 'alert' | 'doorbell') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        if (type === 'chime') {
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, ctx.currentTime);
            gain1.gain.setValueAtTime(0.15, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.3);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
            gain2.gain.setValueAtTime(0, ctx.currentTime);
            gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.5);

            setTimeout(() => ctx.close(), 600);
        }

        if (type === 'alert') {
            [0, 0.2].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(660, ctx.currentTime + offset);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.12);
            });

            setTimeout(() => ctx.close(), 500);
        }

        if (type === 'doorbell') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.8);

            setTimeout(() => ctx.close(), 900);
        }
    } catch (e) {
        console.warn('Notification sound failed:', e);
    }
}

// === Helper: Extract room display number ===
function roomShort(room: string): string {
    const m = room.match(/^(\d+)/);
    return m ? `Room ${m[1]}` : room;
}

// === Main Hook ===

const MAX_VISIBLE_TOASTS = 4;
const AUTO_DISMISS_MS = 8000;

export const useNotifications = (guests: Guest[]) => {
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notifMuted') === 'true');
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [badges, setBadges] = useState<DepartmentBadges>({ housekeeping: 0, maintenance: 0, frontofhouse: 0 });
    const prevGuestsRef = useRef<Map<string, Guest>>(new Map());
    const isInitializedRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoDismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('notifMuted', String(next));
            return next;
        });
    }, []);

    // Push a notification
    const pushNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp'>) => {
        const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const entry: AppNotification = { ...notif, id, timestamp: Date.now() };

        setNotifications(prev => {
            const next = [entry, ...prev];
            // Keep max visible
            return next.slice(0, MAX_VISIBLE_TOASTS * 2); // keep extra buffer for dismissed ones
        });

        // Update badge counts
        setBadges(prev => {
            const next = { ...prev };
            for (const tab of notif.badgeTabs) {
                if (tab === 'housekeeping') next.housekeeping++;
                if (tab === 'maintenance') next.maintenance++;
                if (tab === 'frontofhouse') next.frontofhouse++;
            }
            return next;
        });

        // Auto-dismiss after timeout
        const timer = setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
            autoDismissTimers.current.delete(id);
        }, AUTO_DISMISS_MS);
        autoDismissTimers.current.set(id, timer);
    }, []);

    // Dismiss a single notification
    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        const timer = autoDismissTimers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            autoDismissTimers.current.delete(id);
        }
    }, []);

    // Clear all notifications
    const clearAllNotifications = useCallback(() => {
        setNotifications([]);
        autoDismissTimers.current.forEach(t => clearTimeout(t));
        autoDismissTimers.current.clear();
    }, []);

    // Clear badge for a specific tab (called when user navigates to that tab)
    const clearBadge = useCallback((view: DashboardView) => {
        setBadges(prev => {
            if (view === 'housekeeping') return { ...prev, housekeeping: 0 };
            if (view === 'maintenance') return { ...prev, maintenance: 0 };
            if (view === 'frontofhouse') return { ...prev, frontofhouse: 0 };
            return prev;
        });
    }, []);

    // === Change Detection ===
    useEffect(() => {
        if (guests.length === 0) {
            prevGuestsRef.current.clear();
            isInitializedRef.current = false;
            return;
        }

        // Skip notifications on first load
        if (!isInitializedRef.current) {
            const map = new Map<string, Guest>();
            guests.forEach(g => map.set(g.id, { ...g }));
            prevGuestsRef.current = map;
            isInitializedRef.current = true;
            return;
        }

        if (isMuted) {
            const map = new Map<string, Guest>();
            guests.forEach(g => map.set(g.id, { ...g }));
            prevGuestsRef.current = map;
            return;
        }

        // Debounce to avoid spam during bulk Firebase sync
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            const prev = prevGuestsRef.current;
            let playedChime = false;
            let playedAlert = false;
            let playedDoorbell = false;

            for (const guest of guests) {
                const old = prev.get(guest.id);
                if (!old) continue;

                const rm = roomShort(guest.room);

                // === HK Status Change ===
                if (old.hkStatus !== guest.hkStatus) {
                    const info = HK_STATUS_INFO[guest.hkStatus || 'pending'];
                    pushNotification({
                        type: 'hk_status',
                        department: 'housekeeping',
                        room: guest.room,
                        guestName: guest.name,
                        message: `${rm} → ${info.label}`,
                        emoji: info.emoji,
                        color: info.color,
                        badgeTabs: ['housekeeping', 'frontofhouse'],
                    });
                    if (!playedChime) { playTone('chime'); playedChime = true; }
                }

                // === Maintenance Status Change ===
                if (old.maintenanceStatus !== guest.maintenanceStatus) {
                    const info = MAINTENANCE_STATUS_INFO[guest.maintenanceStatus || 'pending'];
                    pushNotification({
                        type: 'maint_status',
                        department: 'maintenance',
                        room: guest.room,
                        guestName: guest.name,
                        message: `${rm} → ${info.label}`,
                        emoji: info.emoji,
                        color: info.color,
                        badgeTabs: ['maintenance', 'frontofhouse'],
                    });
                    if (!playedChime) { playTone('chime'); playedChime = true; }
                }

                // === Guest Status Change ===
                if (old.guestStatus !== guest.guestStatus && guest.guestStatus) {
                    const info = GUEST_STATUS_INFO[guest.guestStatus];
                    if (info) {
                        // Determine sound and badge based on status
                        if (guest.guestStatus === 'on_site') {
                            pushNotification({
                                type: 'guest_status',
                                department: 'frontofhouse',
                                room: guest.room,
                                guestName: guest.name,
                                message: `${rm} Guest Arrived`,
                                emoji: '🚗',
                                color: '#3b82f6',
                                badgeTabs: ['frontofhouse', 'housekeeping'],
                            });
                            if (!playedDoorbell) { playTone('doorbell'); playedDoorbell = true; }
                        } else if (guest.guestStatus === 'checked_in') {
                            pushNotification({
                                type: 'guest_status',
                                department: 'frontofhouse',
                                room: guest.room,
                                guestName: guest.name,
                                message: `${rm} Checked In`,
                                emoji: '🔑',
                                color: '#22c55e',
                                badgeTabs: ['frontofhouse'],
                            });
                            if (!playedChime) { playTone('chime'); playedChime = true; }
                        } else if (guest.guestStatus === 'awaiting_room') {
                            pushNotification({
                                type: 'guest_status',
                                department: 'frontofhouse',
                                room: guest.room,
                                guestName: guest.name,
                                message: `${rm} Guest Awaiting Room`,
                                emoji: '⏳',
                                color: '#f59e0b',
                                badgeTabs: ['frontofhouse', 'housekeeping'],
                            });
                            if (!playedAlert) { playTone('alert'); playedAlert = true; }
                        } else if (guest.guestStatus === 'courtesy_call_due') {
                            pushNotification({
                                type: 'guest_status',
                                department: 'frontofhouse',
                                room: guest.room,
                                guestName: guest.name,
                                message: `${rm} Courtesy Call Due`,
                                emoji: '📞',
                                color: '#ef4444',
                                badgeTabs: ['frontofhouse'],
                            });
                            if (!playedAlert) { playTone('alert'); playedAlert = true; }
                        } else if (guest.guestStatus === 'no_show') {
                            pushNotification({
                                type: 'guest_status',
                                department: 'frontofhouse',
                                room: guest.room,
                                guestName: guest.name,
                                message: `${rm} No Show`,
                                emoji: '❌',
                                color: '#dc2626',
                                badgeTabs: ['frontofhouse', 'housekeeping', 'maintenance'],
                            });
                            if (!playedAlert) { playTone('alert'); playedAlert = true; }
                        } else if (guest.guestStatus === 'checked_out') {
                            pushNotification({
                                type: 'guest_status',
                                department: 'frontofhouse',
                                room: guest.room,
                                guestName: guest.name,
                                message: `${rm} Checked Out`,
                                emoji: '🚪',
                                color: '#64748b',
                                badgeTabs: ['frontofhouse', 'housekeeping'],
                            });
                            if (!playedChime) { playTone('chime'); playedChime = true; }
                        }
                    }
                }

                // === Room Ready (both HK and Maintenance complete) ===
                if (!isRoomReady(old) && isRoomReady(guest)) {
                    pushNotification({
                        type: 'room_ready',
                        department: 'frontofhouse',
                        room: guest.room,
                        guestName: guest.name,
                        message: `${rm} Ready!`,
                        emoji: '✅',
                        color: '#10b981',
                        badgeTabs: ['frontofhouse', 'housekeeping'],
                    });
                    if (!playedChime) { playTone('chime'); playedChime = true; }
                }

                // === Urgent/High Room Note Added ===
                const oldUrgent = (old.roomNotes || []).filter(n => !n.resolved && (n.priority === 'urgent' || n.priority === 'high')).length;
                const newUrgent = (guest.roomNotes || []).filter(n => !n.resolved && (n.priority === 'urgent' || n.priority === 'high')).length;
                if (newUrgent > oldUrgent) {
                    pushNotification({
                        type: 'room_note',
                        department: 'maintenance',
                        room: guest.room,
                        guestName: guest.name,
                        message: `${rm} Urgent Note`,
                        emoji: '⚠️',
                        color: '#ef4444',
                        badgeTabs: ['maintenance', 'housekeeping'],
                    });
                    if (!playedAlert) { playTone('alert'); playedAlert = true; }
                }

                // === Room Note Resolved ===
                const oldResolved = (old.roomNotes || []).filter(n => n.resolved).length;
                const newResolved = (guest.roomNotes || []).filter(n => n.resolved).length;
                if (newResolved > oldResolved && oldResolved < (old.roomNotes || []).length) {
                    pushNotification({
                        type: 'room_note',
                        department: 'maintenance',
                        room: guest.room,
                        guestName: guest.name,
                        message: `${rm} Note Resolved ✓`,
                        emoji: '✅',
                        color: '#10b981',
                        badgeTabs: ['maintenance'],
                    });
                    if (!playedChime) { playTone('chime'); playedChime = true; }
                }

                // === Turndown Status Change ===
                const oldTd = old.turndownStatus || 'not_started';
                const newTd = guest.turndownStatus || 'not_started';
                if (oldTd !== newTd && newTd !== 'not_started') {
                    if (newTd === 'in_progress') {
                        pushNotification({
                            type: 'hk_status',
                            department: 'housekeeping',
                            room: guest.room,
                            guestName: guest.name,
                            message: `${rm} Turndown Started`,
                            emoji: '🌙',
                            color: '#f59e0b',
                            badgeTabs: ['housekeeping'],
                        });
                        if (!playedChime) { playTone('chime'); playedChime = true; }
                    } else if (newTd === 'complete') {
                        pushNotification({
                            type: 'hk_status',
                            department: 'housekeeping',
                            room: guest.room,
                            guestName: guest.name,
                            message: `${rm} Turndown Done ✓`,
                            emoji: '✅',
                            color: '#22c55e',
                            badgeTabs: ['frontofhouse', 'housekeeping'],
                        });
                        if (!playedChime) { playTone('chime'); playedChime = true; }
                    }
                }

                // === EV Car Charging Status Change ===
                if (old.carOnCharge !== guest.carOnCharge) {
                    if (guest.carOnCharge) {
                        pushNotification({
                            type: 'maint_status',
                            department: 'maintenance',
                            room: guest.room,
                            guestName: guest.name,
                            message: `${rm} Car Plugged In ⚡`,
                            emoji: '🔌',
                            color: '#22c55e',
                            badgeTabs: ['maintenance', 'frontofhouse'],
                        });
                        if (!playedChime) { playTone('chime'); playedChime = true; }
                    } else {
                        pushNotification({
                            type: 'maint_status',
                            department: 'maintenance',
                            room: guest.room,
                            guestName: guest.name,
                            message: `${rm} Car Unplugged`,
                            emoji: '🔋',
                            color: '#f59e0b',
                            badgeTabs: ['maintenance', 'frontofhouse'],
                        });
                        if (!playedAlert) { playTone('alert'); playedAlert = true; }
                    }
                }
            }

            // Update ref
            const map = new Map<string, Guest>();
            guests.forEach(g => map.set(g.id, { ...g }));
            prevGuestsRef.current = map;
        }, 150); // 150ms — fast enough for near-instant notifications from other devices

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [guests, isMuted, pushNotification]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            autoDismissTimers.current.forEach(t => clearTimeout(t));
        };
    }, []);

    return {
        isMuted,
        toggleMute,
        notifications: notifications.slice(0, MAX_VISIBLE_TOASTS),
        badges,
        pushNotification,
        dismissNotification,
        clearAllNotifications,
        clearBadge,
    };
};

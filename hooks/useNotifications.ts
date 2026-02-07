import { useEffect, useRef, useState, useCallback } from 'react';
import { Guest } from '../types';

// === Web Audio API Sound Generation ===
// Generate tones programmatically — no external audio files needed

function playTone(type: 'chime' | 'alert' | 'doorbell') {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

        if (type === 'chime') {
            // Pleasant double-chime for status changes
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
            gain1.gain.setValueAtTime(0.15, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.3);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.15); // C#6
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
            // Rapid double-beep alert for maintenance/urgent issues
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
            // Doorbell-style ding for guest arrivals
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
            osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.6); // C5 slide down
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

// === Main Hook ===

export const useNotifications = (guests: Guest[]) => {
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('notifMuted') === 'true');
    const prevGuestsRef = useRef<Map<string, Guest>>(new Map());
    const isInitializedRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('notifMuted', String(next));
            return next;
        });
    }, []);

    useEffect(() => {
        if (guests.length === 0) {
            prevGuestsRef.current.clear();
            isInitializedRef.current = false;
            return;
        }

        // Skip notifications on first load — only detect CHANGES
        if (!isInitializedRef.current) {
            const map = new Map<string, Guest>();
            guests.forEach(g => map.set(g.id, { ...g }));
            prevGuestsRef.current = map;
            isInitializedRef.current = true;
            return;
        }

        if (isMuted) {
            // Still update ref even when muted so we don't play stale notifications on unmute
            const map = new Map<string, Guest>();
            guests.forEach(g => map.set(g.id, { ...g }));
            prevGuestsRef.current = map;
            return;
        }

        // Debounce to avoid sound spam during bulk Firebase sync
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        debounceTimerRef.current = setTimeout(() => {
            const prev = prevGuestsRef.current;
            let playedChime = false;
            let playedAlert = false;
            let playedDoorbell = false;

            for (const guest of guests) {
                const old = prev.get(guest.id);
                if (!old) continue; // New guest added — not a status change

                // HK status change (advancing in the workflow)
                if (old.hkStatus !== guest.hkStatus && !playedChime) {
                    playTone('chime');
                    playedChime = true;
                }

                // Maintenance status change
                if (old.maintenanceStatus !== guest.maintenanceStatus && !playedChime) {
                    playTone('chime');
                    playedChime = true;
                }

                // New urgent/high room note
                const oldNoteCount = (old.roomNotes || []).filter(n => !n.resolved && (n.priority === 'urgent' || n.priority === 'high')).length;
                const newNoteCount = (guest.roomNotes || []).filter(n => !n.resolved && (n.priority === 'urgent' || n.priority === 'high')).length;
                if (newNoteCount > oldNoteCount && !playedAlert) {
                    playTone('alert');
                    playedAlert = true;
                }

                // Guest arrived on-site
                if (old.guestStatus !== 'on_site' && guest.guestStatus === 'on_site' && !playedDoorbell) {
                    playTone('doorbell');
                    playedDoorbell = true;
                }
            }

            // Update ref
            const map = new Map<string, Guest>();
            guests.forEach(g => map.set(g.id, { ...g }));
            prevGuestsRef.current = map;
        }, 500); // 500ms debounce

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [guests, isMuted]);

    return { isMuted, toggleMute };
};

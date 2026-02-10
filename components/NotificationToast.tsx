import React, { useCallback, useRef } from 'react';
import { AppNotification } from '../hooks/useNotifications';
import { DashboardView } from '../types';

interface NotificationToastProps {
    notifications: AppNotification[];
    onDismiss: (id: string) => void;
    onClearAll: () => void;
    onNavigate: (view: DashboardView) => void;
}

// Map notification department to the dashboard view tab
function departmentToView(dept: AppNotification['department']): DashboardView {
    switch (dept) {
        case 'housekeeping': return 'housekeeping';
        case 'maintenance': return 'maintenance';
        case 'reception': return 'reception';
    }
}

// Department label config
const DEPT_CONFIG: Record<AppNotification['department'], { label: string; iconColor: string }> = {
    housekeeping: { label: 'Housekeeping', iconColor: '#22c55e' },
    maintenance: { label: 'Maintenance', iconColor: '#f59e0b' },
    reception: { label: 'Reception', iconColor: '#3b82f6' },
};

/* ── Swipe-to-dismiss hook ── */
function useSwipeDismiss(onDismiss: () => void) {
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);
    const elRef = useRef<HTMLDivElement>(null);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        isDragging.current = true;
        startX.current = e.touches[0].clientX;
        currentX.current = 0;
        if (elRef.current) {
            elRef.current.style.transition = 'none';
        }
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const deltaX = e.touches[0].clientX - startX.current;
        currentX.current = deltaX;
        if (elRef.current) {
            const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 300);
            elRef.current.style.transform = `translateX(${deltaX}px)`;
            elRef.current.style.opacity = String(opacity);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        isDragging.current = false;
        const threshold = 80;
        if (Math.abs(currentX.current) > threshold) {
            // Swipe out
            if (elRef.current) {
                const direction = currentX.current > 0 ? 400 : -400;
                elRef.current.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
                elRef.current.style.transform = `translateX(${direction}px)`;
                elRef.current.style.opacity = '0';
            }
            setTimeout(onDismiss, 250);
        } else {
            // Spring back
            if (elRef.current) {
                elRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
                elRef.current.style.transform = 'translateX(0px)';
                elRef.current.style.opacity = '1';
            }
        }
    }, [onDismiss]);

    return { elRef, onTouchStart, onTouchMove, onTouchEnd };
}

/* ── Single Toast Item ── */
const ToastItem: React.FC<{
    notif: AppNotification;
    onDismiss: (id: string) => void;
    onNavigate: (view: DashboardView) => void;
}> = ({ notif, onDismiss, onNavigate }) => {
    const dept = DEPT_CONFIG[notif.department];
    const age = Math.max(0, Date.now() - notif.timestamp);
    const secondsAgo = Math.floor(age / 1000);
    const timeLabel = secondsAgo < 2 ? 'just now' : `${secondsAgo}s ago`;

    const handleClick = useCallback(() => {
        onNavigate(departmentToView(notif.department));
        onDismiss(notif.id);
    }, [notif, onNavigate, onDismiss]);

    const { elRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeDismiss(
        () => onDismiss(notif.id)
    );

    return (
        <div
            ref={elRef}
            className="notification-toast"
            onClick={handleClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            role="alert"
            style={{ '--notif-color': notif.color } as React.CSSProperties}
        >
            {/* Left accent bar */}
            <div className="notification-toast-accent" style={{ background: notif.color }} />

            {/* Content */}
            <div className="notification-toast-body">
                <div className="notification-toast-header">
                    <span className="notification-toast-dept" style={{ color: dept.iconColor }}>
                        {dept.label}
                    </span>
                    <span className="notification-toast-time">{timeLabel}</span>
                </div>
                <div className="notification-toast-message">
                    <span className="notification-toast-emoji">{notif.emoji}</span>
                    <span>{notif.message}</span>
                </div>
                <div className="notification-toast-guest">{notif.guestName}</div>
            </div>

            {/* Dismiss button */}
            <button
                className="notification-toast-dismiss"
                onClick={(e) => { e.stopPropagation(); onDismiss(notif.id); }}
                aria-label="Dismiss notification"
            >
                ✕
            </button>

            {/* Auto-dismiss progress bar */}
            <div className="notification-toast-progress" style={{ animationDuration: '8s' }} />
        </div>
    );
};

const NotificationToast: React.FC<NotificationToastProps> = ({
    notifications,
    onDismiss,
    onClearAll,
    onNavigate,
}) => {
    if (notifications.length === 0) return null;

    return (
        <div className="notification-toast-container">
            {/* Clear all button when 2+ notifications */}
            {notifications.length >= 2 && (
                <button
                    className="notification-clear-all"
                    onClick={onClearAll}
                    title="Clear all notifications"
                >
                    Clear All
                </button>
            )}

            {notifications.map((notif) => (
                <ToastItem
                    key={notif.id}
                    notif={notif}
                    onDismiss={onDismiss}
                    onNavigate={onNavigate}
                />
            ))}
        </div>
    );
};

export default NotificationToast;

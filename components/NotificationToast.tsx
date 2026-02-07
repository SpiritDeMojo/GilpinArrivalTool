import React, { useCallback } from 'react';
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

const NotificationToast: React.FC<NotificationToastProps> = ({
    notifications,
    onDismiss,
    onClearAll,
    onNavigate,
}) => {
    const handleClick = useCallback((notif: AppNotification) => {
        onNavigate(departmentToView(notif.department));
        onDismiss(notif.id);
    }, [onNavigate, onDismiss]);

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

            {notifications.map((notif) => {
                const dept = DEPT_CONFIG[notif.department];
                const age = Math.max(0, Date.now() - notif.timestamp);
                const secondsAgo = Math.floor(age / 1000);
                const timeLabel = secondsAgo < 2 ? 'just now' : `${secondsAgo}s ago`;

                return (
                    <div
                        key={notif.id}
                        className="notification-toast"
                        onClick={() => handleClick(notif)}
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
            })}
        </div>
    );
};

export default NotificationToast;

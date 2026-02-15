import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    HandoverDepartment, HandoverReport, HANDOVER_DEPT_INFO, Guest
} from '../types';
import { useGuestData } from '../contexts/GuestDataProvider';
import { getAllHandoversForDate } from '../services/firebaseService';
import '../styles/handover.css';

const ALL_DEPTS: HandoverDepartment[] = ['housekeeping', 'source', 'spice', 'reception', 'spa', 'maintenance', 'reservations', 'night', 'lakehouse'];

// ── Field labels for display ──
const FIELD_LABELS: Record<string, string> = {
    // Housekeeping AM
    roomsCleaned: 'Rooms Cleaned', roomsOutstanding: 'Rooms Outstanding',
    roomsDND: 'DND Rooms (Cat Signs)', roomsPlantATree: 'Plant-a-Tree Rooms',
    linenChanges: 'Linen Changes', deepCleans: 'Deep Cleans',
    stayoverNotes: 'Stayover Notes', unresolvedNotes: 'Unresolved Notes',
    // Housekeeping PM
    turndownsDone: 'Turndowns Done', turndownsPending: 'Turndowns Pending',
    dndRooms: 'DND Rooms (No Turndown)', turndownIssues: 'Turndown Issues',
    // Source AM
    breakfastCovers: 'Breakfast Covers', minibarRestocks: 'Minibar Restocks',
    breakfastHighlights: 'Breakfast Highlights', breakfastIssues: 'Breakfast Issues',
    // Source PM / Spice
    lunchCovers: 'Lunch Covers', dinnerCovers: 'Dinner Covers', serviceNotes: 'Service Notes',
    dietaryIncidents: 'Dietary/Allergy', stockIssues: 'Stock Issues', specialEvents: 'Events',
    sourceGoogleRating: 'Source Rating', latestSourceReview: 'Source Review',
    spiceGoogleRating: 'Spice Rating', latestSpiceReview: 'Spice Review',
    // Reception
    checkInsToday: 'Check-ins', checkOutsToday: 'Check-outs',
    noShows: 'No Shows', vipArrivals: 'VIP Arrivals', returnGuests: 'Return Guests',
    dogsInHouse: 'Dogs in House',
    guestComplaints: 'Complaints', compensationGiven: 'Compensation',
    managerEscalations: 'Manager Escalations', fourDayCallsDone: '4-Day Calls',
    tomorrowArrivals: "Tomorrow's Arrivals", tomorrowOccupancy: "Tomorrow's Occupancy",
    hotelGoogleRating: 'Google Rating', latestHotelReview: 'Latest Review',
    // Reservations
    newBookingsToday: 'New Bookings', cancellations: 'Cancellations',
    amendments: 'Amendments', futureOccupancyNotes: 'Occupancy Notes',
    groupBookings: 'Group Bookings', specialRequestsFlagged: 'Special Requests',
    // Spa
    treatmentsCompleted: 'Treatments', cancellationsNoShows: 'Cancellations/No-Shows',
    productSalesNotes: 'Product Sales', equipmentIssues: 'Equipment', guestFeedback: 'Guest Feedback',
    // Maintenance
    jobsCompleted: 'Jobs Completed', jobsOutstanding: 'Jobs Outstanding',
    urgentIssues: 'Urgent Issues', partsOrdered: 'Parts Ordered',
    // Night
    lateArrivals: 'Late Arrivals', earlyDepartures: 'Early Departures',
    guestRequests: 'Guest Requests', securityIssues: 'Security Issues',
    noiseComplaints: 'Noise Complaints', facilitiesIssues: 'Facilities Issues',
    morningPrep: 'Morning Prep', incidentReport: 'Incident Report',
    // Lake House
    lhCheckIns: 'LH Check-ins', lhCheckOuts: 'LH Check-outs',
    lhVipArrivals: 'LH VIP Arrivals', lhReturnGuests: 'LH Returns',
    lhGuestComplaints: 'LH Complaints', lhSpecialRequests: 'LH Special Requests',
    lhGoogleRating: 'Lake House Rating', latestLHReview: 'LH Latest Review',
};

interface DayReportProps {
    onClose: () => void;
}

const DayReport: React.FC<DayReportProps> = ({ onClose }) => {
    const { guests } = useGuestData();
    const [reports, setReports] = useState<HandoverReport[]>([]);
    const [loading, setLoading] = useState(true);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [currentDate, setCurrentDate] = useState(todayStr);

    const dateDisplay = useMemo(() => {
        const d = new Date(currentDate + 'T12:00:00');
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }, [currentDate]);

    // ── Load all reports for the date ──
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        (async () => {
            const all = await getAllHandoversForDate(currentDate);
            if (!cancelled) {
                setReports(all);
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [currentDate]);

    // ── Compute stats from guest data ──
    const stats = useMemo(() => {
        const checkIns = guests.filter(g => g.guestStatus === 'checked_in').length;
        const checkOuts = guests.filter(g => g.guestStatus === 'checked_out').length;
        const totalRooms = guests.length;
        const dogs = guests.filter(g => /dog|pet/i.test((g.prefillNotes || '') + (g.preferences || ''))).length;
        const vips = guests.filter(g => /vip|important|celebrity/i.test(g.preferences || '')).length;
        const returnGuests = guests.filter(g => (g.stayHistoryCount || 0) > 0).length;
        const occupancy = totalRooms > 0 ? Math.round((totalRooms / 25) * 100) : 0;
        return { checkIns, checkOuts, totalRooms, dogs, vips, returnGuests, occupancy };
    }, [guests]);

    // ── Date nav ──
    const changeDate = useCallback((delta: number) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + delta);
        setCurrentDate(d.toISOString().split('T')[0]);
    }, [currentDate]);

    // ── Helpers ──
    const renderDataSection = (label: string, data?: Record<string, any>, notes?: string) => {
        if (!data || Object.keys(data).length === 0) return null;
        const entries = Object.entries(data).filter(([, v]) => v !== '' && v !== 0 && v !== undefined);
        if (entries.length === 0 && !notes) return null;
        return (
            <>
                {label && <div className="dr-shift-label">{label}</div>}
                {entries.map(([key, val]) => (
                    <div key={key} className="dr-field-row">
                        <span className="dr-field-label">{FIELD_LABELS[key] || key}</span>
                        <span className="dr-field-value">{String(val)}</span>
                    </div>
                ))}
                {notes && <div className="dr-notes-block">{notes}</div>}
            </>
        );
    };

    // ── Print ──
    const handlePrint = useCallback(() => {
        const deptSections = ALL_DEPTS.map(dept => {
            const report = reportMap[dept];
            const info = HANDOVER_DEPT_INFO[dept];
            if (!report?.amData && !report?.pmData) {
                return `<div class="dept"><h3>${info.emoji} ${info.label}</h3><p class="pending">Not submitted</p></div>`;
            }

            let content = '';
            if (report?.amData) {
                const amLabel = info.amLabel || (info.shiftType === 'single' ? '' : 'AM Shift');
                const fields = Object.entries(report.amData.structured || {})
                    .filter(([, v]) => v !== '' && v !== 0)
                    .map(([k, v]) => `<tr><td>${FIELD_LABELS[k] || k}</td><td>${v}</td></tr>`)
                    .join('');
                const notes = report.amData.freeNotes ? `<div class="notes">${report.amData.freeNotes}</div>` : '';
                content += amLabel ? `<h4>☀️ ${amLabel}</h4>` : '';
                content += `<table>${fields}</table>${notes}`;
            }
            if (report?.pmData) {
                const pmLabel = info.pmLabel || 'PM Shift';
                const pmFields = Object.entries(report.pmData.structured || {})
                    .filter(([, v]) => v !== '' && v !== 0)
                    .map(([k, v]) => `<tr><td>${FIELD_LABELS[k] || k}</td><td>${v}</td></tr>`)
                    .join('');
                const pmNotes = report.pmData.freeNotes ? `<div class="notes">${report.pmData.freeNotes}</div>` : '';
                content += `<h4>🌙 ${pmLabel}</h4><table>${pmFields}</table>${pmNotes}`;
            }

            const author = report?.amData?.completedBy || report?.pmData?.completedBy || 'Unknown';
            return `<div class="dept"><h3>${info.emoji} ${info.label}</h3>${content}
        <p class="author">Completed by ${author}</p></div>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Day Report — ${dateDisplay}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1e293b; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #64748b; font-size: 13px; margin-bottom: 20px; }
        .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .stat { padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center; min-width: 80px; }
        .stat .val { font-size: 24px; font-weight: 900; color: #c5a065; }
        .stat .lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
        .dept { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; overflow: hidden; page-break-inside: avoid; }
        .dept h3 { padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .dept h4 { padding: 8px 16px; font-size: 11px; color: #64748b; text-transform: uppercase; }
        .dept table { width: 100%; padding: 0 16px; border-collapse: collapse; }
        .dept td { padding: 5px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
        .dept td:first-child { color: #64748b; width: 40%; }
        .dept td:last-child { font-weight: 600; text-align: right; }
        .notes { padding: 8px 16px; font-size: 11px; color: #334155; background: #fefce8; border-top: 1px solid #fef9c3; white-space: pre-wrap; }
        .pending { padding: 12px 16px; color: #94a3b8; font-style: italic; font-size: 12px; }
        .author { padding: 8px 16px; font-size: 10px; color: #94a3b8; }
        @media print { body { padding: 12px; } .stats .stat { border: 1px solid #ccc; } }
      </style></head><body>
      <h1>📋 Gilpin Hotel — Day Report</h1>
      <p class="subtitle">${dateDisplay}</p>
      <div class="stats">
        <div class="stat"><div class="val">${stats.checkIns}</div><div class="lbl">Check-ins</div></div>
        <div class="stat"><div class="val">${stats.checkOuts}</div><div class="lbl">Check-outs</div></div>
        <div class="stat"><div class="val">${stats.totalRooms}</div><div class="lbl">Total Rooms</div></div>
        <div class="stat"><div class="val">${stats.occupancy}%</div><div class="lbl">Occupancy</div></div>
        <div class="stat"><div class="val">${stats.returnGuests}</div><div class="lbl">Return Guests</div></div>
        <div class="stat"><div class="val">${stats.dogs}</div><div class="lbl">Dogs</div></div>
        <div class="stat"><div class="val">${stats.vips}</div><div class="lbl">VIPs</div></div>
      </div>
      ${deptSections}
    </body></html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            setTimeout(() => w.print(), 400);
        }
    }, [reports, dateDisplay, stats]);

    const reportMap = useMemo(() => {
        const map: Record<string, HandoverReport> = {};
        reports.forEach(r => { map[r.department] = r; });
        return map;
    }, [reports]);

    return (
        <motion.div
            className="day-report-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* ─── Header ─── */}
            <div className="day-report-header">
                <h2>📋 Day Handover Report</h2>
                <div className="handover-date-picker">
                    <button onClick={() => changeDate(-1)}>◀</button>
                    <span className="handover-date-label">{dateDisplay}</span>
                    <button onClick={() => changeDate(1)} disabled={currentDate >= todayStr}>▶</button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="dr-print-btn" onClick={handlePrint}>🖨️ Print Report</button>
                    <button className="handover-close" onClick={onClose}>✕</button>
                </div>
            </div>

            {/* ─── Body ─── */}
            <div className="day-report-body">
                <div className="day-report-content">
                    {/* Stats Bar */}
                    <div className="dr-stats-bar">
                        <div className="dr-stat"><span className="stat-value">{stats.checkIns}</span><span className="stat-label">Check-ins</span></div>
                        <div className="dr-stat"><span className="stat-value">{stats.checkOuts}</span><span className="stat-label">Check-outs</span></div>
                        <div className="dr-stat"><span className="stat-value">{stats.totalRooms}</span><span className="stat-label">Total Rooms</span></div>
                        <div className="dr-stat"><span className="stat-value">{stats.occupancy}%</span><span className="stat-label">Occupancy</span></div>
                        <div className="dr-stat"><span className="stat-value">{stats.returnGuests}</span><span className="stat-label">🔄 Returns</span></div>
                        <div className="dr-stat"><span className="stat-value">{stats.dogs}</span><span className="stat-label">🐕 Dogs</span></div>
                        <div className="dr-stat"><span className="stat-value">{stats.vips}</span><span className="stat-label">⭐ VIPs</span></div>
                    </div>

                    {/* Department Sections */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                            <span style={{ fontSize: 32 }}>⏳</span>
                            <p>Loading handovers...</p>
                        </div>
                    ) : (
                        ALL_DEPTS.map(dept => {
                            const info = HANDOVER_DEPT_INFO[dept];
                            const report = reportMap[dept];
                            const hasData = !!report?.amData || !!report?.pmData;

                            // Determine status
                            let statusLabel = '⏳ Pending';
                            let statusClass = 'pending';
                            if (hasData) {
                                if (info.shiftType === 'single') {
                                    statusLabel = '✅ Submitted';
                                    statusClass = 'submitted';
                                } else if (report?.pmData) {
                                    statusLabel = '✅ Complete';
                                    statusClass = 'submitted';
                                } else if (report?.amLockedAt) {
                                    statusLabel = '🔒 AM Locked';
                                    statusClass = 'submitted';
                                } else {
                                    statusLabel = '📝 Draft';
                                    statusClass = 'submitted';
                                }
                            }

                            return (
                                <div key={dept} className="dr-dept-section">
                                    <div className="dr-dept-header">
                                        <span className="dept-dot" style={{ background: info.color }} />
                                        <h3>{info.emoji} {info.label}</h3>
                                        <span className={`dept-status ${statusClass}`}>
                                            {statusLabel}
                                        </span>
                                    </div>

                                    <div className="dr-dept-body">
                                        {!hasData ? (
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>
                                                No handover submitted yet for {info.label}
                                            </p>
                                        ) : (
                                            <>
                                                {/* AM Data / Single Data */}
                                                {report?.amData && renderDataSection(
                                                    info.shiftType === 'single' ? '' : `☀️ ${info.amLabel || 'AM'}`,
                                                    report.amData.structured,
                                                    report.amData.freeNotes
                                                )}

                                                {/* PM Data */}
                                                {report?.pmData && renderDataSection(
                                                    `🌙 ${info.pmLabel || 'PM'}`,
                                                    report.pmData.structured,
                                                    report.pmData.freeNotes
                                                )}

                                                {/* Author */}
                                                <div style={{ fontSize: 10, color: '#94a3b8', padding: '8px 0 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                                    Completed by {report?.amData?.completedBy || report?.pmData?.completedBy || 'Unknown'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default DayReport;

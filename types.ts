// ==========================================
// EXISTING TYPES
// ==========================================

export interface Guest {
  id: string;
  room: string;
  name: string;
  car: string;
  ll: string;
  eta: string;
  duration: string;
  facilities: string;
  prefillNotes: string;
  inRoomItems: string;
  preferences: string;
  rawHtml: string;
  rateCode?: string;
  packageName?: string;
  stayHistoryCount?: number;
  isManual?: boolean;
  roomType?: string;

  // ==========================================
  // HOUSEKEEPING DASHBOARD FIELDS (Phase 6)
  // ==========================================

  /** Housekeeping completion status (independent) */
  hkStatus?: HKStatus;

  /** Maintenance completion status (independent) */
  maintenanceStatus?: MaintenanceStatus;

  /** Guest status for reception workflow */
  guestStatus?: GuestStatus;

  /** Cross-department room notes (visible to all departments) */
  roomNotes?: RoomNote[];

  /** Whether in-room items have been delivered */
  inRoomDelivered?: boolean;

  /** Who delivered the in-room items */
  inRoomDeliveredBy?: string;

  /** Timestamp when in-room items were delivered */
  inRoomDeliveredAt?: number;

  /** Notes from courtesy calls */
  courtesyCallNotes?: CourtesyCallNote[];

  /** Last time any status was updated */
  lastStatusUpdate?: number;

  /** Who made the last status update */
  lastStatusUpdatedBy?: string;

  // Legacy field for backwards compatibility
  roomStatus?: RoomStatus;

  // ==========================================
  // AUDIT & TRACKING FIELDS
  // ==========================================

  /** Activity log for audit trail */
  activityLog?: AuditEntry[];

  /** Room move history */
  roomMoves?: RoomMove[];

  /** Previous room (set after a room move) */
  previousRoom?: string;

  /** AI-generated tags from sentiment analysis */
  aiTags?: string[];
}

export interface ArrivalSession {
  id: string;
  label: string;
  dateObj: string;
  guests: Guest[];
  lastModified?: number;
}

export interface GlobalAnalyticsData {
  strategicMix: { name: string; value: number }[];
  occupancyPulse: { date: string; count: number }[];
  riskAnalysis: { name: string; value: number }[];
  strategicInsights: string;
  loyaltyRate: number;
  vipIntensity: number;
  lastUpdated: number;
}

export interface Flag {
  id: number;
  name: string;
  emoji: string;
  keys: string[];
}

export type PropertyFilter = 'total' | 'main' | 'lake';
export type FilterType = 'all' | 'main' | 'lake' | 'vip' | 'allergy' | 'return';
export type PrintMode = 'master' | 'greeter' | 'delivery';
export type NavPrintMode = 'main' | 'greeter' | 'inroom';
export type RefinementField = 'notes' | 'facilities' | 'inRoomItems' | 'preferences' | 'packages' | 'history' | 'car';

export interface RoomMapping {
  [key: string]: number;
}

// ==========================================
// HOUSEKEEPING DASHBOARD TYPES (Phase 6)
// ==========================================

/**
 * Housekeeping status (independent workflow)
 */
export type HKStatus =
  | 'pending'           // Room needs cleaning
  | 'in_progress'       // Cleaning in progress
  | 'cleaned'           // Cleaned, awaiting supervisor check
  | 'inspected'         // Supervisor approved
  | 'complete';         // HK complete

/**
 * Maintenance status (independent workflow)
 */
export type MaintenanceStatus =
  | 'pending'           // Needs maintenance check
  | 'in_progress'       // Maintenance in progress
  | 'complete';         // Maintenance complete

/**
 * Cross-department room note
 */
export interface RoomNote {
  id: string;
  timestamp: number;
  author: string;
  department: 'housekeeping' | 'maintenance' | 'reception';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'issue' | 'info' | 'request' | 'resolved';
  message: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
}

// Legacy type for backwards compatibility
export type RoomStatus =
  | 'dirty'
  | 'cleaned_awaiting_check'
  | 'hk_checked'
  | 'awaiting_maintenance'
  | 'maintenance_checked'
  | 'handed_back';

/**
 * Guest status for reception workflow
 */
export type GuestStatus =
  | 'pre_arrival'
  | 'on_site'
  | 'off_site'
  | 'awaiting_room'
  | 'room_ready_notified'
  | 'checked_in'
  | 'courtesy_call_due'
  | 'call_complete';

/**
 * Note from a courtesy call
 */
export interface CourtesyCallNote {
  id: string;
  timestamp: number;
  author: string;
  type: 'issue' | 'happy' | 'neutral';
  note: string;
}

/**
 * Dashboard view type
 */
export type DashboardView = 'arrivals' | 'housekeeping' | 'maintenance' | 'reception';

/**
 * Status update event for real-time sync
 */
export interface StatusUpdateEvent {
  guestId: string;
  field: 'roomStatus' | 'guestStatus' | 'inRoomDelivered' | 'hkStatus' | 'maintenanceStatus';
  oldValue: string | boolean;
  newValue: string | boolean;
  updatedBy: string;
  timestamp: number;
}

/**
 * Audit log entry for tracking all guest changes
 */
export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  field: string;
  oldValue?: string;
  newValue: string;
  performedBy: string;
}

/**
 * Room move record for red-lining
 */
export interface RoomMove {
  id: string;
  timestamp: number;
  fromRoom: string;
  toRoom: string;
  movedBy: string;
  reason?: string;
}

/**
 * Housekeeping status display info
 */
export const HK_STATUS_INFO: Record<HKStatus, { label: string; emoji: string; color: string; bgColor: string }> = {
  pending: { label: 'Needs Cleaning', emoji: '🔴', color: '#dc2626', bgColor: '#fef2f2' },
  in_progress: { label: 'Cleaning', emoji: '🧹', color: '#f59e0b', bgColor: '#fefce8' },
  cleaned: { label: 'Cleaned', emoji: '✨', color: '#3b82f6', bgColor: '#eff6ff' },
  inspected: { label: 'Inspected', emoji: '👁️', color: '#8b5cf6', bgColor: '#f5f3ff' },
  complete: { label: 'HK Complete', emoji: '✅', color: '#22c55e', bgColor: '#f0fdf4' },
};

/**
 * Maintenance status display info
 */
export const MAINTENANCE_STATUS_INFO: Record<MaintenanceStatus, { label: string; emoji: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending Check', emoji: '🔧', color: '#f59e0b', bgColor: '#fefce8' },
  in_progress: { label: 'In Progress', emoji: '⚙️', color: '#3b82f6', bgColor: '#eff6ff' },
  complete: { label: 'Complete', emoji: '✅', color: '#22c55e', bgColor: '#f0fdf4' },
};

/**
 * Room note priority info
 */
export const NOTE_PRIORITY_INFO: Record<RoomNote['priority'], { label: string; emoji: string; color: string; bgColor: string }> = {
  low: { label: 'Low', emoji: '📝', color: '#64748b', bgColor: '#f1f5f9' },
  medium: { label: 'Medium', emoji: '📋', color: '#f59e0b', bgColor: '#fefce8' },
  high: { label: 'High', emoji: '⚠️', color: '#f97316', bgColor: '#fff7ed' },
  urgent: { label: 'Urgent', emoji: '🚨', color: '#dc2626', bgColor: '#fef2f2' },
};

/**
 * Room status display info for UI (legacy)
 */
export const ROOM_STATUS_INFO: Record<RoomStatus, { label: string; emoji: string; color: string }> = {
  dirty: { label: 'Dirty', emoji: '🔴', color: '#ef4444' },
  cleaned_awaiting_check: { label: 'Cleaned - Awaiting Check', emoji: '🟡', color: '#eab308' },
  hk_checked: { label: 'HK Checked', emoji: '🟢', color: '#22c55e' },
  awaiting_maintenance: { label: 'Awaiting Maintenance', emoji: '🔧', color: '#f97316' },
  maintenance_checked: { label: 'Maintenance Checked', emoji: '✅', color: '#14b8a6' },
  handed_back: { label: 'Ready', emoji: '🟢', color: '#10b981' },
};

/**
 * Guest status display info for UI
 */
export const GUEST_STATUS_INFO: Record<GuestStatus, { label: string; emoji: string; color: string }> = {
  pre_arrival: { label: 'Pre-Arrival', emoji: '📅', color: '#94a3b8' },
  on_site: { label: 'On Site', emoji: '🚗', color: '#3b82f6' },
  off_site: { label: 'Off Site', emoji: '🚶', color: '#64748b' },
  awaiting_room: { label: 'Awaiting Room', emoji: '⏳', color: '#f59e0b' },
  room_ready_notified: { label: 'Room Ready - Notified', emoji: '📱', color: '#8b5cf6' },
  checked_in: { label: 'Checked In', emoji: '🔑', color: '#22c55e' },
  courtesy_call_due: { label: 'Courtesy Call Due', emoji: '📞', color: '#ef4444' },
  call_complete: { label: 'Call Complete', emoji: '✅', color: '#10b981' },
};

/**
 * Helper: Check if room is ready for guest (both HK and Maintenance complete)
 */
export function isRoomReady(guest: Guest): boolean {
  const hkComplete = guest.hkStatus === 'complete';
  const maintenanceComplete = guest.maintenanceStatus === 'complete';
  return hkComplete && maintenanceComplete;
}

/**
 * Helper: Get combined room readiness info
 */
export function getRoomReadinessInfo(guest: Guest): { ready: boolean; hkDone: boolean; maintDone: boolean; label: string; color: string } {
  const hkDone = guest.hkStatus === 'complete';
  const maintDone = guest.maintenanceStatus === 'complete';
  const ready = hkDone && maintDone;

  if (ready) {
    return { ready, hkDone, maintDone, label: 'Ready for Guest', color: '#22c55e' };
  } else if (hkDone && !maintDone) {
    return { ready, hkDone, maintDone, label: 'Awaiting Maintenance', color: '#f59e0b' };
  } else if (!hkDone && maintDone) {
    return { ready, hkDone, maintDone, label: 'Awaiting Housekeeping', color: '#3b82f6' };
  } else {
    return { ready, hkDone, maintDone, label: 'Not Ready', color: '#dc2626' };
  }
}
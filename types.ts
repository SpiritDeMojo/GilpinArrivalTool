// ==========================================
// EXISTING TYPES
// ==========================================

export type Department = 'HK' | 'MAIN' | 'REC';
export type UserLocation = 'main' | 'lake';

/** Map user-friendly aliases to canonical department codes */
export const DEPARTMENT_ALIASES: Record<string, Department> = {
  housekeeping: 'HK',
  hk: 'HK',
  maintenance: 'MAIN',
  main: 'MAIN',
  reception: 'REC',
  reservations: 'REC',
  manager: 'REC',
  rec: 'REC',
  res: 'REC',
  hod: 'REC',
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  HK: 'Housekeeping',
  MAIN: 'Maintenance',
  REC: 'Front of House',
};

export interface Guest {
  id: string;
  room: string;
  name: string;
  car: string;
  ll: string;
  eta: string;
  duration: string;
  facilities: string;
  /** Raw facility text with /Venue: patterns for venue-colored highlighting */
  facilitiesRaw?: string;
  prefillNotes: string;
  inRoomItems: string;
  preferences: string;
  rawHtml: string;
  /** Raw booking text from PDF, reconstructed with columns properly separated */
  bookingStream?: string;
  /** Structured booking stream lines with X/Y positions for PDF-faithful rendering */
  bookingStreamStructured?: { text: string; x: number; y: number }[];
  rateCode?: string;
  packageName?: string;
  stayHistoryCount?: number;
  isManual?: boolean;
  roomType?: string;

  /** Housekeeping-specific notes (allergies, dietary, room prep) from AI */
  hkNotes?: string;

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
  // TURNDOWN FIELDS
  // ==========================================

  /** Turndown completion status */
  turndownStatus?: TurndownStatus;

  /** Manual dinner time override (HH:MM or 'none') */
  dinnerTime?: string;

  /** Dinner venue override */
  dinnerVenue?: string;

  /** Whether the guest's car is currently on an EV charger */
  carOnCharge?: boolean;

  /** Timestamp when car was put on charge */
  carOnChargeAt?: number;

  /** Whether the guest has requested EV charging (waiting queue) */
  chargeRequested?: boolean;

  /** Timestamp when charging was requested (used for FCFS ordering) */
  chargeRequestedAt?: number;

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

  /** AI-generated welcome/celebration card text */
  specialCard?: string;

  // ==========================================
  // PDF PARSER ENHANCED FIELDS
  // ==========================================

  /** Number of adults (from ACEB column) */
  adults?: number;

  /** Number of children (from ACEB column) */
  children?: number;

  /** Number of infants (from ACEB column) */
  infants?: number;

  /** Whether guest completed pre-registration online */
  preRegistered?: boolean;

  /** Booking source / agent (e.g. "Booking.com", "Direct") */
  bookingSource?: string;

  /** Smoking preference */
  smokingPreference?: string;

  /** Deposit amount in GBP */
  depositAmount?: string;

  /** Billing method (e.g. "Pay Own Account", "Company Invoice") */
  billingMethod?: string;

  /** Previous stay history */
  stayHistory?: { arrival: string; departure: string; room: string }[];

  /** Guest-requested bookings (from traces/notes) — may not be confirmed */
  requestedBookings?: string[];

  // ==========================================
  // GUEST ISSUE TRACKING (In-House)
  // ==========================================

  /** Guest issues reported during their stay */
  guestIssues?: GuestIssue[];
}

export interface ArrivalSession {
  id: string;
  label: string;
  dateObj: string;
  guests: Guest[];
  lastModified?: number;
  /** Timestamp when AI Audit was last run on this session */
  aiAuditedAt?: number;
  /** Timestamp when this session was locked/saved as final */
  lockedAt?: number;
  /** Who locked/saved this session */
  lockedBy?: string;
  /** Timestamp when turndown list was verified by reception */
  turndownVerifiedAt?: number;
  /** Who verified the turndown list */
  turndownVerifiedBy?: string;
}

export interface GlobalAnalyticsData {
  strategicMix: { name: string; value: number }[];
  occupancyPulse: { date: string; count: number }[];
  riskAnalysis: { name: string; value: number }[];
  strategicInsights: string;
  loyaltyRate: number;
  vipIntensity: number;
  averageOccupancy?: number;
  lastUpdated: number;
}

export interface Flag {
  id: number;
  name: string;
  emoji: string;
  keys: string[];
  /** When true, keys must match as whole words (word-boundary regex) instead of substring includes */
  wordBoundary?: boolean;
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
 * Turndown status (evening room preparation)
 */
export type TurndownStatus =
  | 'not_started'       // Awaiting turndown
  | 'in_progress'       // Turndown in progress
  | 'complete';         // Turndown complete

/**
 * Cross-department room note
 */
export interface RoomNote {
  id: string;
  timestamp: number;
  author: string;
  department: 'housekeeping' | 'maintenance' | 'frontofhouse';
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
  | 'call_complete'
  | 'checked_out'
  | 'no_show'
  | 'cancelled';

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
 * Guest issue report (In-House dashboard)
 */
export interface GuestIssue {
  id: string;
  timestamp: number;
  room: string;
  guestName: string;
  reportedBy: string;
  issue: string;
  compensation: string;
  resolved: boolean;
  resolvedAt?: number;
  needsManager: boolean;
  managerNotes?: string;
  managerHandledBy?: string;
  managerHandledAt?: number;
}


// (Handover types moved to end of file)

/**
 * Dashboard view type
 */
export type DashboardView = 'arrivals' | 'housekeeping' | 'maintenance' | 'frontofhouse' | 'inhouse' | 'packages' | 'handoverHub';

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
 * Turndown status display info
 */
export const TURNDOWN_STATUS_INFO: Record<TurndownStatus, { label: string; emoji: string; color: string; bgColor: string }> = {
  not_started: { label: 'Not Started', emoji: '🌙', color: '#6366f1', bgColor: '#eef2ff' },
  in_progress: { label: 'In Progress', emoji: '🧹', color: '#f59e0b', bgColor: '#fefce8' },
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
  checked_out: { label: 'Checked Out', emoji: '🚪', color: '#64748b' },
  no_show: { label: 'No Show', emoji: '❌', color: '#dc2626' },
  cancelled: { label: 'Cancelled', emoji: '⊘', color: '#94a3b8' },
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

// ==========================================
// HANDOVER SYSTEM TYPES
// ==========================================

/** Departments that submit handover reports */
export type HandoverDepartment = 'housekeeping' | 'source' | 'spice' | 'reception' | 'spa' | 'maintenance' | 'reservations' | 'night' | 'lakehouse';

/** Shift configuration per department */
export type ShiftType = 'single' | 'am_pm';

/** Department metadata for UI rendering */
export interface HandoverDeptMeta {
  label: string;
  emoji: string;
  color: string;
  shiftType: ShiftType;
  amLabel?: string;
  pmLabel?: string;
}

export const HANDOVER_DEPT_INFO: Record<HandoverDepartment, HandoverDeptMeta> = {
  housekeeping: { label: 'Housekeeping', emoji: '🧹', color: '#22c55e', shiftType: 'am_pm', amLabel: 'Check-ins & Stayovers', pmLabel: 'Turndown' },
  source: { label: 'Source', emoji: '🍽️', color: '#f59e0b', shiftType: 'am_pm', amLabel: 'Breakfast', pmLabel: 'Lunch & Dinner' },
  spice: { label: 'Spice', emoji: '🌶️', color: '#ef4444', shiftType: 'am_pm', amLabel: undefined, pmLabel: 'Dinner' },
  reception: { label: 'Reception', emoji: '🏨', color: '#3b82f6', shiftType: 'single' },
  spa: { label: 'Spa', emoji: '💆', color: '#8b5cf6', shiftType: 'single' },
  maintenance: { label: 'Maintenance', emoji: '🔧', color: '#f97316', shiftType: 'single' },
  reservations: { label: 'Reservations', emoji: '📞', color: '#ec4899', shiftType: 'single' },
  night: { label: 'Night', emoji: '🌙', color: '#6366f1', shiftType: 'single' },
  lakehouse: { label: 'Lake House', emoji: '🏡', color: '#0ea5e9', shiftType: 'am_pm', amLabel: 'Breakfast', pmLabel: 'Reception & Reviews' },
};

/** Data for a single shift handover */
export interface DepartmentHandover {
  structured: Record<string, any>;
  freeNotes: string;
  completedBy: string;
  completedAt: number;
}

/** Full handover report for one department on one date */
export interface HandoverReport {
  id: string;
  date: string;
  department: HandoverDepartment;
  amData?: DepartmentHandover;
  pmData?: DepartmentHandover;
  amLockedAt?: number;
  amLockedBy?: string;
  lastUpdated: number;
  lastUpdatedBy: string;
}
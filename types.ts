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
}

// NEW: Moved here for global access
export interface ArrivalSession {
  id: string;
  label: string;
  dateObj: string;
  guests: Guest[];
  lastModified?: number;
}

export interface Flag {
  id: number;
  name: string;
  emoji: string;
  keys: string[];
}

export type FilterType = 'all' | 'main' | 'lake' | 'vip' | 'allergy' | 'return';
export type PrintMode = 'master' | 'greeter' | 'delivery';
export type RefinementField = 'notes' | 'facilities' | 'inRoomItems' | 'preferences' | 'packages' | 'history';

export interface RoomMapping {
  [key: string]: number;
}
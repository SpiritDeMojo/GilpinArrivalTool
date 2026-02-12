
import { Flag, RoomMapping } from './types';

export const ROOM_MAP: RoomMapping = {
  'lyth': 1, 'winster': 2, 'cleabarrow': 3, 'crosthwaite': 4, 'crook': 5, 'wetherlam': 6,
  'heathwaite': 7, 'troutbeck': 8, 'kentmere': 9, 'rydal': 10, 'grasmere': 11, 'patterdale': 12,
  'thirlmere': 13, 'buttermere': 14, 'catbells': 15, 'cat bells': 15, 'crinkle': 16, 'crinkle crags': 16,
  'dollywagon': 17, 'haystacks': 18, 'st sunday': 19, 'sergeant': 20, 'birdoswald': 21,
  'maglona': 22, 'glannoventa': 23, 'voreda': 24, 'hardknott': 25, 'brathay': 26,
  'crake': 27, 'duddon': 28, 'mint': 29, 'lowther': 30, 'lyvennet': 31,
  'harriet': 51, 'ethel': 52, 'adgie': 53, 'gertie': 54, 'maud': 55, 'beatrice': 56, 'tarn': 57, 'knipe': 58,
  'boat': 60, 'lodge': 60
};

/**
 * Room type categories — maps room number → category name.
 * Main Hotel hierarchy (lowest → highest): Classic → Master → Junior Suite → Garden Room → Spa Lodge → Spa Suite
 * Lake House hierarchy: LH Classic → LH Master → LH Suite / LH Spa Suite
 */
export type RoomType =
  | 'Classic' | 'Master' | 'Junior Suite' | 'Garden Room' | 'Spa Lodge' | 'Spa Suite'
  | 'LH Suite' | 'LH Classic' | 'LH Master' | 'LH Spa Suite';

export const ROOM_TYPES: Record<number, RoomType> = {
  // Main Hotel
  5: 'Classic', 10: 'Classic',
  1: 'Master', 2: 'Master', 3: 'Master', 4: 'Master', 6: 'Master', 7: 'Master',
  8: 'Junior Suite', 9: 'Junior Suite', 11: 'Junior Suite', 12: 'Junior Suite',
  13: 'Junior Suite', 14: 'Junior Suite',
  15: 'Garden Room', 16: 'Garden Room', 17: 'Garden Room', 18: 'Garden Room',
  19: 'Garden Room', 20: 'Garden Room',
  21: 'Spa Lodge', 22: 'Spa Lodge', 23: 'Spa Lodge', 24: 'Spa Lodge', 25: 'Spa Lodge',
  26: 'Spa Suite', 27: 'Spa Suite', 28: 'Spa Suite', 30: 'Spa Suite', 31: 'Spa Suite',
  // Lake House
  51: 'LH Suite',
  53: 'LH Classic',
  52: 'LH Master', 54: 'LH Master', 55: 'LH Master', 56: 'LH Master',
  57: 'LH Spa Suite', 58: 'LH Spa Suite',
};

/**
 * Valid upgrade paths — one category up only.
 * Strategic purpose: free the cheaper room for last-minute bookings.
 */
export const UPGRADE_HIERARCHY: Record<RoomType, RoomType[]> = {
  'Classic': ['Master'],
  'Master': ['Junior Suite'],
  'Junior Suite': ['Garden Room'],
  'Garden Room': ['Spa Lodge'],
  'Spa Lodge': ['Spa Suite'],
  'Spa Suite': [],                    // Already top tier — no upgrade
  'LH Classic': ['LH Master'],
  'LH Master': ['LH Suite', 'LH Spa Suite'],
  'LH Suite': ['LH Spa Suite'],
  'LH Spa Suite': [],                    // Already top tier
};

/** Get the room type for a room number */
export const getRoomType = (roomNum: number): RoomType | null => ROOM_TYPES[roomNum] || null;


export const DEFAULT_FLAGS: Flag[] = [
  { id: 1, name: "VIP", emoji: "⭐", keys: ["VIP", "Director", "Celebrity", "Owner", "Chairman", "High Profile", "Pride of Britain", "POB_STAFF", "POB", "Porsche"] },
  { id: 2, name: "Oat Milk", emoji: "🥛", keys: ["oat milk", "carton of oat"] },
  { id: 3, name: "Soya Milk", emoji: "🥛", keys: ["soya milk"] },
  { id: 4, name: "Nut Allergy", emoji: "🥜", keys: ["nut free", "no nut", "allergic to nuts", "peanut", "nut allergy"] },
  { id: 5, name: "Gluten Free", emoji: "🍞", keys: ["gluten free", "gf", "coeliac", "celiac"] },
  { id: 6, name: "Dairy Free", emoji: "🧀", keys: ["dairy free", "lactose intollerant", "no dairy", "milk allergy"] },
  { id: 7, name: "Pets", emoji: "🐾", keys: ["dog bed", "dog bowl", "dog in room", "pet in room", "🐕", "🐶", "🐾", "canine", "puppy", "greyhound", "cockapoo", "labrador", "retriever", "spaniel", "terrier", "poodle", "dachshund", "collie", "whippet", "lurcher", "staffie", "beagle", "cocker", "springer"], wordBoundary: true },
  { id: 9, name: "Comp stay", emoji: "🟢", keys: ["comp stay", "complimentary", "upgrade", "unaware"] },
  { id: 10, name: "Prev Issue", emoji: "🚩", keys: ["complaint", "PGI", "dissatisfied", "previous problem", "previous issue", "guest issue", "raised a concern"], wordBoundary: true },
  { id: 11, name: "Occasion", emoji: "🎉", keys: ["birthday", "anniversary", "honeymoon", "proposal", "engagement", "babymoon"] },
  { id: 12, name: "Voucher", emoji: "🎫", keys: ["voucher"] }
];

// UI Layout Constants
export const NAV_HEIGHT = 72;
export const ALERT_HEIGHT = 28;
export const TABS_HEIGHT = 50;

// AI Processing Batch Size
export const BATCH_SIZE = 50;

// Brand Assets - Updated to the user-provided direct image link
export const GILPIN_LOGO_URL = '/gilpin-logo.png';

/**
 * Extract room number from a room string
 * e.g., "12 PATTERDALE" -> 12, "51 HARRIET" -> 51
 */
export const getRoomNumber = (room: string): number => {
  // First try to get number from start of string
  const numMatch = room.match(/^(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }

  // Otherwise look up in room map using name portion
  const namePart = room.replace(/^\d+\s*/, '').toLowerCase().trim();
  if (ROOM_MAP[namePart]) {
    return ROOM_MAP[namePart];
  }

  // Default fallback
  return 0;
};

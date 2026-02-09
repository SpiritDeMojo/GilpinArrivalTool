
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

export const DEFAULT_FLAGS: Flag[] = [
  { id: 1, name: "VIP", emoji: "⭐", keys: ["VIP", "Director", "Celebrity", "Owner", "Chairman", "High Profile", "Pride of Britain", "POB_STAFF", "POB", "Porsche"] },
  { id: 2, name: "Oat Milk", emoji: "🥛", keys: ["oat milk", "carton of oat"] },
  { id: 3, name: "Soya Milk", emoji: "🥛", keys: ["soya milk"] },
  { id: 4, name: "Nut Allergy", emoji: "🥜", keys: ["nut free", "no nut", "allergic to nuts", "peanut", "nut allergy"] },
  { id: 5, name: "Gluten Free", emoji: "🍞", keys: ["gluten free", "gf", "coeliac", "celiac"] },
  { id: 6, name: "Dairy Free", emoji: "🧀", keys: ["dairy free", "lactose intollerant", "no dairy", "milk allergy"] },
  { id: 7, name: "Pets", emoji: "🐾", keys: ["dog", "cat", "pet in room", "canine", "puppy", "greyhound", "cockapoo", "labrador", "retriever"] },
  { id: 9, name: "Comp stay", emoji: "🟢", keys: ["comp stay", "complimentary", "upgrade", "unaware"] },
  { id: 10, name: "Prev Issue", emoji: "🚩", keys: ["complaint", "PGI", "issue", "dissatisfied", "previous problem"] },
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

import { Flag, RoomMapping } from './types';

export const ROOM_MAP: RoomMapping = {
  'lyth': 1, 'winster': 2, 'cleabarrow': 3, 'crosthwaite': 4, 'crook': 5, 'wetherlam': 6,
  'heathwaite': 7, 'troutbeck': 8, 'kentmere': 9, 'rydal': 10, 'grasmere': 11, 'patterdale': 12,
  'thirlmere': 13, 'buttermere': 14, 'catbells': 15, 'cat bells': 15, 'crinkle': 16, 'crinkle crags': 16,
  'dollywagon': 17, 'haystacks': 18, 'st sunday': 19, 'sergeant': 20, 'birdoswald': 21,
  'maglona': 22, 'glannoventa': 23, 'voreda': 24, 'hardknott': 25, 'brathay': 26,
  'crake': 27, 'duddon': 28, 'mint': 29, 'lowther': 30, 'lyvennet': 31,
  'harriet': 51, 'ethel': 52, 'adgie': 53, 'gertie': 54, 'maud': 55, 'beatrice': 56, 'knipe': 57, 'tarn': 58,
  'boat': 60, 'lodge': 60
};

export const DEFAULT_FLAGS: Flag[] = [
  { id: 1, name: "VIP", emoji: "⭐", keys: ["VIP", "Director", "Showround", "Owner", "Chairman", "High Profile"] },
  { id: 2, name: "Oat Milk", emoji: "🥛", keys: ["oat milk", "carton of oat"] },
  { id: 3, name: "Soya Milk", emoji: "🥛", keys: ["soya milk"] },
  { id: 4, name: "Nut Allergy", emoji: "🥜", keys: ["nut free", "no nut", "anaphylaxis", "peanut", "nut allergy"] },
  { id: 5, name: "Gluten Free", emoji: "🍞", keys: ["gluten free", "gf", "coeliac", "celiac"] },
  { id: 6, name: "Dairy Free", emoji: "🧀", keys: ["dairy free", "lactose", "no dairy", "milk allergy"] },
  { id: 7, name: "Pets", emoji: "🐾", keys: ["dog", "cat", "pet", "canine", "puppy", "greyhound", "cockapoo", "labrador", "retriever"] },
  { id: 9, name: "Comp Stay", emoji: "🟢", keys: ["comp stay", "complimentary", "foc", "upgrade", "unaware"] },
  { id: 10, name: "Prev Issue", emoji: "🚩", keys: ["complaint", "recovery", "issue", "dissatisfied", "previous problem", "recovery stay"] },
  { id: 11, name: "Occasion", emoji: "🎉", keys: ["birthday", "anniversary", "honeymoon", "proposal", "engagement", "celebration", "babymoon"] },
  { id: 12, name: "Voucher", emoji: "🎫", keys: ["voucher", "redeem", "gift certificate"] },
  { id: 13, name: "Pre-Reg", emoji: "📱", keys: ["pre-registration", "completed online"] }
];
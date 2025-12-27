// ============================================================================
// FRENCH RAP ARTISTS DATABASE
// Verified Deezer artist IDs for French rap artists
// ============================================================================

export interface FrenchRapArtist {
  id: number;
  name: string;
}

// Verified French rap artists with their Deezer IDs
export const FRENCH_RAP_ARTISTS: FrenchRapArtist[] = [
  { id: 544, name: 'Booba' },
  { id: 6575813, name: 'Ninho' },
  { id: 5313805, name: 'Jul' },
  { id: 4932985, name: 'SCH' },
  { id: 6824757, name: 'Damso' },
  { id: 4412926, name: 'PNL' },
  { id: 4261483, name: 'Nekfeu' },
  { id: 50182, name: 'Orelsan' },
  { id: 7622383, name: 'Niska' },
  { id: 9635624, name: 'Maes' },
  { id: 1819753, name: 'Kaaris' },
  { id: 5505679, name: 'Vald' },
  { id: 1523614, name: 'Lacrim' },
  { id: 9282498, name: 'PLK' },
  { id: 5266132, name: 'Naps' },
  { id: 419118, name: 'Alonzo' },
  { id: 1179, name: 'La Fouine' },
  { id: 1087, name: 'Rohff' },
  { id: 5312302, name: 'Gradur' },
  { id: 428, name: 'Soprano' },
  { id: 1308916, name: 'Gims' },
  { id: 11276023, name: 'Koba LaD' },
  { id: 55776442, name: 'Gazo' },
  { id: 77287382, name: 'Tiakola' },
  { id: 8523523, name: 'SDM' },
  { id: 13988498, name: 'Dinos' },
  { id: 13519, name: 'Lomepal' },
  { id: 11278792, name: 'Laylow' },
  { id: 66361832, name: 'Freeze Corleone' },
  { id: 14890617, name: 'Leto' },
  { id: 5347738, name: 'Dadju' },
  { id: 7524195, name: 'MHD' },
  { id: 1433942, name: 'Bigflo & Oli' },
  { id: 13113874, name: 'Heuss L\'enfoire' },
  { id: 892, name: 'IAM' },
  { id: 1225, name: 'MC Solaar' },
  { id: 103029382, name: 'Ziak' },
  { id: 62531962, name: 'Werenoi' },
  { id: 4410483, name: 'Alpha Wann' },
  { id: 10531896, name: 'Hornet La Frappe' },
];

// Create a Set of valid artist IDs for O(1) lookup
export const VALID_ARTIST_IDS = new Set(FRENCH_RAP_ARTISTS.map(a => a.id));

// Create a Map for artist name lookup by ID
export const ARTIST_NAMES_BY_ID = new Map(FRENCH_RAP_ARTISTS.map(a => [a.id, a.name]));

// Create a Set of valid artist names (lowercase) for backup verification
export const VALID_ARTIST_NAMES = new Set(FRENCH_RAP_ARTISTS.map(a => a.name.toLowerCase()));

// Verify if an artist is a French rapper
export function isFrenchRapArtist(artistId: number, artistName?: string): boolean {
  if (VALID_ARTIST_IDS.has(artistId)) return true;
  if (artistName && VALID_ARTIST_NAMES.has(artistName.toLowerCase())) return true;
  return false;
}

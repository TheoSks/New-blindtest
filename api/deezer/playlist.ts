import type { VercelRequest, VercelResponse } from '@vercel/node';

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  artist: {
    id: number;
    name: string;
  };
  album: {
    id: number;
    title: string;
    cover_medium: string;
  };
}

interface DeezerPlaylistResponse {
  id: number;
  title: string;
  tracks: {
    data: DeezerTrack[];
  };
}

interface DeezerTopTracksResponse {
  data: DeezerTrack[];
}

// Popular Deezer playlist IDs for different genres/moods
const PLAYLISTS: Record<string, string> = {
  pop: '1111141961', // Top Pop
  rock: '1111142221', // Top Rock
  hiphop: '1111142361', // Top Hip-Hop
  electro: '1111142541', // Top Electro
  french: '1111143121', // Top French
  hits: '1313621735', // Top Hits
  oldies: '1111142181', // Top Oldies
  latino: '1116190041', // Top Latino
};

// ============================================================================
// FRENCH RAP ARTISTS DATABASE - Verified Deezer Artist IDs
// Only tracks from these artists will be included in "Rap FR" category
// ============================================================================
const FRENCH_RAP_ARTISTS_DB: Map<number, string> = new Map([
  // Legends / Old School
  [544, 'Booba'],
  [1087, 'Rohff'],
  [1179, 'La Fouine'],
  [428, 'Soprano'],
  [892, 'IAM'],
  [1434, 'NTM'],
  [1225, 'MC Solaar'],
  [1183, 'Sniper'],
  [1175, 'Sinik'],
  [1194, 'Sefyu'],
  [1182, 'Sexion d\'Assaut'],

  // 2010s Wave
  [1308916, 'Gims'],
  [50182, 'Orelsan'],
  [1819753, 'Kaaris'],
  [1523614, 'Lacrim'],
  [5312302, 'Gradur'],
  [4261483, 'Nekfeu'],
  [419118, 'Alonzo'],
  [5505679, 'Vald'],
  [4412926, 'PNL'],
  [5266132, 'Naps'],
  [5313805, 'Jul'],

  // New Generation
  [6575813, 'Ninho'],
  [4932985, 'SCH'],
  [6824757, 'Damso'],
  [7622383, 'Niska'],
  [9635624, 'Maes'],
  [9282498, 'PLK'],
  [11276023, 'Koba LaD'],
  [8523523, 'SDM'],
  [13988498, 'Dinos'],
  [13519, 'Lomepal'],
  [11278792, 'Laylow'],
  [66361832, 'Freeze Corleone'],
  [55776442, 'Gazo'],
  [77287382, 'Tiakola'],
  [14890617, 'Leto'],
  [62531962, 'Werenoi'],
  [103029382, 'Ziak'],

  // Other popular French rappers
  [4749498, 'Dosseh'],
  [267166, 'Rim\'K'],
  [1091, 'Kerry James'],
  [404958, 'Youssoupha'],
  [4737958, 'Sofiane'],
  [5347738, 'Dadju'],
  [12077756, 'Djadja & Dinaz'],
  [10531896, 'Hornet La Frappe'],
  [5312420, 'Kalash Criminel'],
  [7524195, 'MHD'],
  [10933498, 'Hamza'],
  [1433942, 'Bigflo & Oli'],
  [13113874, 'Heuss L\'enfoiré'],
  [4297753, 'Disiz'],
  [4780, 'Oxmo Puccino'],
  [5575299, 'Georgio'],
  [9515690, 'Larry'],
  [71188372, 'Guy2Bezbar'],
  [63714502, 'Zamdane'],
  [5298632, 'Alkpote'],
  [141584442, 'Rsko'],
  [4410483, 'Alpha Wann'],
  [4410553, 'Jazzy Bazz'],
  [175862, 'Kery James'],
]);

// Get set of valid artist IDs for quick lookup
const VALID_FRENCH_RAP_ARTIST_IDS = new Set(FRENCH_RAP_ARTISTS_DB.keys());

// Get array of artist IDs for iteration
const FRENCH_RAP_ARTIST_IDS = Array.from(FRENCH_RAP_ARTISTS_DB.keys());

/**
 * Verify if a track is from a French rap artist
 * Only returns true if the PRIMARY artist is in our verified database
 */
function isVerifiedFrenchRapTrack(track: DeezerTrack): boolean {
  return VALID_FRENCH_RAP_ARTIST_IDS.has(track.artist.id);
}

/**
 * Get top tracks for a specific artist by their Deezer ID
 */
async function getArtistTopTracks(artistId: number): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/artist/${artistId}/top?limit=15`
    );
    if (!response.ok) return [];

    const data: DeezerTopTracksResponse = await response.json();
    if (!data.data) return [];

    // Double verification: only keep tracks with preview AND from verified artist
    return data.data.filter(track =>
      track.preview &&
      isVerifiedFrenchRapTrack(track)
    );
  } catch {
    return [];
  }
}

/**
 * Fetch French rap tracks using multiple strategies for robustness
 */
async function fetchFrenchRapTracks(): Promise<DeezerTrack[]> {
  // Strategy 1: Get top tracks from random selection of verified artists
  const shuffledIds = [...FRENCH_RAP_ARTIST_IDS].sort(() => Math.random() - 0.5);
  const selectedIds = shuffledIds.slice(0, 15); // Get 15 random artists

  const trackPromises = selectedIds.map(id => getArtistTopTracks(id));
  const results = await Promise.all(trackPromises);

  // Combine and deduplicate
  const allTracks = results.flat();
  const seenIds = new Set<number>();
  const uniqueTracks: DeezerTrack[] = [];

  for (const track of allTracks) {
    if (!seenIds.has(track.id)) {
      seenIds.add(track.id);
      uniqueTracks.push(track);
    }
  }

  console.log(`[Rap FR] Fetched ${uniqueTracks.length} verified French rap tracks from ${selectedIds.length} artists`);

  return uniqueTracks;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { genre } = req.query;
  const genreKey = typeof genre === 'string' ? genre.toLowerCase() : 'hits';

  try {
    // Special handling for French Rap
    if (genreKey === 'rapfr') {
      const frenchRapTracks = await fetchFrenchRapTracks();

      if (frenchRapTracks.length < 5) {
        console.error(`[Rap FR] Not enough tracks: ${frenchRapTracks.length}`);
        return res.status(200).json({
          success: false,
          error: 'Not enough French rap tracks found',
          tracks: [],
        });
      }

      // Shuffle and transform to our format
      const shuffledTracks = [...frenchRapTracks].sort(() => Math.random() - 0.5);
      const tracks = shuffledTracks.map(track => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumCover: track.album.cover_medium,
      }));

      return res.status(200).json({
        success: true,
        playlist: 'Rap Français',
        tracks,
        meta: {
          totalArtists: FRENCH_RAP_ARTISTS_DB.size,
          tracksReturned: tracks.length,
        },
      });
    }

    // Regular playlist handling for other genres
    const playlistId = PLAYLISTS[genreKey] || PLAYLISTS.hits;
    const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`);

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }

    const data: DeezerPlaylistResponse = await response.json();

    // Filter tracks that have a preview URL
    const tracksWithPreview = data.tracks.data.filter(track => track.preview);

    // Transform to our format
    const tracks = tracksWithPreview.map(track => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      previewUrl: track.preview,
      albumCover: track.album.cover_medium,
    }));

    res.status(200).json({
      success: true,
      playlist: data.title,
      tracks,
    });
  } catch (error) {
    console.error('Deezer API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch playlist from Deezer',
    });
  }
}

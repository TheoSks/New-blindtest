import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// FRENCH RAP ARTISTS - CORRECT DEEZER IDs (verified via API)
// ============================================================================
const FRENCH_RAP_ARTISTS = [
  { id: 390, name: 'Booba' },
  { id: 5542343, name: 'Ninho' },
  { id: 1191615, name: 'Jul' },
  { id: 162665, name: 'SCH' },
  { id: 9197980, name: 'Damso' },
  { id: 1519461, name: 'PNL' },
  { id: 1412564, name: 'Nekfeu' },
  { id: 259467, name: 'Orelsan' },
  { id: 5288900, name: 'Niska' },
  { id: 4448630, name: 'Maes' },
  { id: 388973, name: 'Kaaris' },
  { id: 5175734, name: 'Vald' },
  { id: 4087782, name: 'Lacrim' },
  { id: 1479842, name: 'PLK' },
  { id: 4842061, name: 'Naps' },
  { id: 259729, name: 'Alonzo' },
  { id: 12778, name: 'La Fouine' },
  { id: 750, name: 'Rohff' },
  { id: 5876247, name: 'Gradur' },
  { id: 13011, name: 'Soprano' },
  { id: 4429712, name: 'GIMS' },
  { id: 14621667, name: 'Koba LaD' },
  { id: 8873540, name: 'Gazo' },
  { id: 13918545, name: 'Tiakola' },
  { id: 604107, name: 'SDM' },
  { id: 292949, name: 'Dinos' },
  { id: 5111084, name: 'Lomepal' },
  { id: 4510044, name: 'Laylow' },
  { id: 13755123, name: 'Freeze Corleone' },
  { id: 14065531, name: 'Leto' },
  { id: 4803754, name: 'Dadju' },
  { id: 881751, name: 'MHD' },
  { id: 5497121, name: 'Bigflo & Oli' },
  { id: 13645509, name: 'Heuss L\'enfoire' },
  { id: 48, name: 'IAM' },
  { id: 63, name: 'MC Solaar' },
  { id: 7668530, name: 'Ziak' },
];

const VALID_ARTIST_IDS = new Set(FRENCH_RAP_ARTISTS.map(a => a.id));

// ============================================================================
// INTERFACES
// ============================================================================
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

// ============================================================================
// PLAYLIST IDS
// ============================================================================
const PLAYLISTS: Record<string, string> = {
  pop: '1111141961',
  rock: '1111142221',
  hiphop: '1111142361',
  electro: '1111142541',
  french: '1111143121',
  hits: '1313621735',
  oldies: '1111142181',
  latino: '1116190041',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
async function getArtistTopTracks(artistId: number): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/artist/${artistId}/top?limit=10`
    );

    if (!response.ok) {
      return [];
    }

    const data: DeezerTopTracksResponse = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    // Only keep tracks with preview from verified French rap artists
    return data.data.filter(track =>
      track.preview && VALID_ARTIST_IDS.has(track.artist.id)
    );
  } catch {
    return [];
  }
}

async function getFrenchRapTracks(): Promise<DeezerTrack[]> {
  // Shuffle and pick 15 artists
  const shuffled = [...FRENCH_RAP_ARTISTS].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 15);

  // Fetch in parallel
  const results = await Promise.all(
    selected.map(a => getArtistTopTracks(a.id))
  );

  // Combine and deduplicate
  const allTracks = results.flat();
  const seen = new Set<number>();
  const unique: DeezerTrack[] = [];

  for (const track of allTracks) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      unique.push(track);
    }
  }

  return unique;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { genre } = req.query;
  const genreKey = typeof genre === 'string' ? genre.toLowerCase() : 'hits';

  try {
    // FRENCH RAP
    if (genreKey === 'rapfr') {
      const tracks = await getFrenchRapTracks();

      if (tracks.length < 5) {
        return res.status(200).json({
          success: false,
          error: 'Pas assez de morceaux',
          tracks: [],
        });
      }

      const shuffled = [...tracks].sort(() => Math.random() - 0.5);

      return res.status(200).json({
        success: true,
        playlist: 'Rap Francais',
        tracks: shuffled.map(t => ({
          id: t.id.toString(),
          title: t.title,
          artist: t.artist.name,
          previewUrl: t.preview,
          albumCover: t.album.cover_medium,
        })),
      });
    }

    // OTHER GENRES
    const playlistId = PLAYLISTS[genreKey] || PLAYLISTS.hits;
    const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`);

    if (!response.ok) {
      throw new Error(`Deezer error: ${response.status}`);
    }

    const data: DeezerPlaylistResponse = await response.json();
    const withPreview = data.tracks.data.filter(t => t.preview);

    res.status(200).json({
      success: true,
      playlist: data.title,
      tracks: withPreview.map(t => ({
        id: t.id.toString(),
        title: t.title,
        artist: t.artist.name,
        previewUrl: t.preview,
        albumCover: t.album.cover_medium,
      })),
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// FRENCH RAP ARTISTS DATABASE (inline to avoid Vercel import issues)
// ============================================================================
const FRENCH_RAP_ARTISTS = [
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
async function getArtistTopTracks(artistId: number, artistName: string): Promise<DeezerTrack[]> {
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
    selected.map(a => getArtistTopTracks(a.id, a.name))
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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  FRENCH_RAP_ARTISTS,
  VALID_ARTIST_IDS,
} from '../data/frenchRapTracks';

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

// Popular Deezer playlist IDs for different genres
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

/**
 * Fetch top tracks for a French rap artist
 * STRICT: Only returns tracks where the artist ID matches exactly
 */
async function getArtistTopTracks(artistId: number, artistName: string): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/artist/${artistId}/top?limit=10`
    );

    if (!response.ok) {
      console.log(`[Rap FR] Failed to fetch ${artistName}: ${response.status}`);
      return [];
    }

    const data: DeezerTopTracksResponse = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    // STRICT FILTER: Only keep tracks where:
    // 1. Has preview URL
    // 2. Artist ID matches EXACTLY (no collabs with non-French artists)
    const validTracks = data.data.filter(track => {
      if (!track.preview) return false;

      // Must be from a verified French rap artist
      return VALID_ARTIST_IDS.has(track.artist.id);
    });

    console.log(`[Rap FR] ${artistName}: ${validTracks.length}/${data.data.length} tracks valid`);

    return validTracks;
  } catch (error) {
    console.error(`[Rap FR] Error fetching ${artistName}:`, error);
    return [];
  }
}

/**
 * Get French rap tracks from verified artists
 */
async function getFrenchRapTracks(): Promise<DeezerTrack[]> {
  // Shuffle artists and pick 15
  const shuffledArtists = [...FRENCH_RAP_ARTISTS].sort(() => Math.random() - 0.5);
  const selectedArtists = shuffledArtists.slice(0, 15);

  console.log(`[Rap FR] Fetching from ${selectedArtists.length} artists...`);

  // Fetch tracks from each artist in parallel
  const promises = selectedArtists.map(artist =>
    getArtistTopTracks(artist.id, artist.name)
  );

  const results = await Promise.all(promises);

  // Combine and deduplicate
  const allTracks = results.flat();
  const seen = new Set<number>();
  const uniqueTracks: DeezerTrack[] = [];

  for (const track of allTracks) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      uniqueTracks.push(track);
    }
  }

  console.log(`[Rap FR] Total: ${uniqueTracks.length} unique tracks`);

  return uniqueTracks;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { genre } = req.query;
  const genreKey = typeof genre === 'string' ? genre.toLowerCase() : 'hits';

  try {
    // === FRENCH RAP CATEGORY ===
    if (genreKey === 'rapfr') {
      const tracks = await getFrenchRapTracks();

      if (tracks.length < 5) {
        console.error(`[Rap FR] Not enough tracks: ${tracks.length}`);
        return res.status(200).json({
          success: false,
          error: 'Pas assez de morceaux disponibles',
          tracks: [],
        });
      }

      // Shuffle and format
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      const formatted = shuffled.map(track => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumCover: track.album.cover_medium,
      }));

      return res.status(200).json({
        success: true,
        playlist: 'Rap Francais',
        tracks: formatted,
      });
    }

    // === OTHER GENRES - Use Deezer playlists ===
    const playlistId = PLAYLISTS[genreKey] || PLAYLISTS.hits;
    const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`);

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }

    const data: DeezerPlaylistResponse = await response.json();

    const tracksWithPreview = data.tracks.data.filter(track => track.preview);

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
    console.error('[Playlist] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du chargement',
    });
  }
}

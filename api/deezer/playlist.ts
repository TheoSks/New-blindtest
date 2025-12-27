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

interface DeezerSearchResponse {
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

// French rap artists to search for
const FRENCH_RAP_SEARCH_TERMS = [
  'Booba', 'Ninho', 'Jul', 'SCH', 'Damso', 'PNL', 'Nekfeu', 'Orelsan',
  'Freeze Corleone', 'Gazo', 'PLK', 'Niska', 'Maes', 'Koba LaD', 'Lacrim',
  'Kaaris', 'Vald', 'Laylow', 'Dinos', 'Leto', 'SDM', 'Ziak', 'Tiakola',
  'Werenoi', 'Naps', 'Alonzo', 'La Fouine', 'Rohff', 'Gradur', 'Hornet La Frappe'
];

// Search for tracks by a French rap artist
async function searchFrenchRapTracks(artistName: string): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=artist:"${encodeURIComponent(artistName)}"&limit=10`
    );
    if (!response.ok) return [];
    const data: DeezerSearchResponse = await response.json();
    if (!data.data) return [];

    // Only keep tracks from this specific artist
    return data.data.filter(track =>
      track.preview &&
      track.artist.name.toLowerCase().includes(artistName.toLowerCase())
    );
  } catch {
    return [];
  }
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
    // Special handling for French Rap - search for specific artists
    if (genreKey === 'rapfr') {
      // Pick random artists to search
      const shuffledArtists = [...FRENCH_RAP_SEARCH_TERMS].sort(() => Math.random() - 0.5);
      const selectedArtists = shuffledArtists.slice(0, 15);

      // Search for tracks from each artist in parallel
      const searchPromises = selectedArtists.map(artist => searchFrenchRapTracks(artist));
      const searchResults = await Promise.all(searchPromises);

      // Combine all tracks
      const allTracks = searchResults.flat();

      // Remove duplicates by track ID
      const seenIds = new Set<number>();
      const uniqueTracks = allTracks.filter(track => {
        if (seenIds.has(track.id)) return false;
        seenIds.add(track.id);
        return true;
      });

      console.log(`Rap FR: Found ${uniqueTracks.length} unique tracks`);

      if (uniqueTracks.length < 5) {
        return res.status(200).json({
          success: false,
          error: 'Not enough French rap tracks found',
          tracks: [],
        });
      }

      // Shuffle and transform
      const shuffledTracks = [...uniqueTracks].sort(() => Math.random() - 0.5);
      const tracks = shuffledTracks.map(track => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        previewUrl: track.preview,
        albumCover: track.album.cover_medium,
      }));

      return res.status(200).json({
        success: true,
        playlist: 'Rap FR',
        tracks,
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

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
const PLAYLISTS = {
  pop: '1111141961', // Top Pop
  rock: '1111142221', // Top Rock
  hiphop: '1111142361', // Top Hip-Hop
  electro: '1111142541', // Top Electro
  french: '1111143121', // Top French
  hits: '1313621735', // Top Hits
  oldies: '1111142181', // Top Oldies
  latino: '1116190041', // Top Latino
};

// French rap artists for dedicated Rap FR search
const FRENCH_RAP_ARTISTS = [
  'Booba', 'PNL', 'Ninho', 'Jul', 'Nekfeu', 'Orelsan', 'Damso', 'SCH',
  'Freeze Corleone', 'Gazo', 'Lacrim', 'Kaaris', 'Maes', 'Niska', 'Aya Nakamura',
  'Leto', 'PLK', 'Zola', 'Koba LaD', 'Soolking', 'Heuss L\'enfoire', 'Dinos',
  'Laylow', 'Alpha Wann', 'La Fouine', 'Rohff', 'Gradur', 'SDM', 'Tiakola',
  'Werenoi', 'Green Montana', 'Guy2bezbar', 'Rsko', 'Ziak', 'Hamza', 'Dosseh'
];

// Fetch tracks for a French rap artist
async function fetchArtistTracks(artist: string): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=artist:"${encodeURIComponent(artist)}"&limit=10`
    );
    if (!response.ok) return [];
    const data: DeezerSearchResponse = await response.json();
    return data.data || [];
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
    // Special handling for French Rap
    if (genreKey === 'rapfr') {
      // Shuffle artists and pick random ones
      const shuffledArtists = [...FRENCH_RAP_ARTISTS].sort(() => Math.random() - 0.5);
      const selectedArtists = shuffledArtists.slice(0, 10);

      // Fetch tracks from multiple artists in parallel
      const artistTracksPromises = selectedArtists.map(fetchArtistTracks);
      const artistTracksResults = await Promise.all(artistTracksPromises);

      // Combine all tracks
      const allTracks = artistTracksResults.flat();

      // Filter tracks with preview and remove duplicates
      const seenIds = new Set<number>();
      const uniqueTracks = allTracks.filter(track => {
        if (!track.preview || seenIds.has(track.id)) return false;
        seenIds.add(track.id);
        return true;
      });

      // Shuffle and transform
      const shuffledTracks = uniqueTracks.sort(() => Math.random() - 0.5);
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
    const playlistId = PLAYLISTS[genreKey as keyof typeof PLAYLISTS] || PLAYLISTS.hits;

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

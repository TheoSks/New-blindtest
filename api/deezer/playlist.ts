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
  // Rap FR - Multiple official French rap playlists
  rapfr: '1109890291', // Rap FR officiel Deezer
};

// Backup French rap playlist IDs in case the main one fails
const RAPFR_BACKUP_PLAYLISTS = [
  '1109890291',  // Rap FR
  '6287534604',  // Rap Français 2024
  '1306931615',  // 100% Rap Français
  '4403076402',  // Rap FR Classiques
];

// Helper function to fetch a playlist by ID
async function fetchPlaylist(playlistId: string): Promise<DeezerTrack[] | null> {
  try {
    const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`);
    if (!response.ok) return null;
    const data: DeezerPlaylistResponse = await response.json();
    if (!data.tracks?.data) return null;
    return data.tracks.data.filter(track => track.preview);
  } catch {
    return null;
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
    // Special handling for French Rap - try multiple playlists
    if (genreKey === 'rapfr') {
      let tracksWithPreview: DeezerTrack[] = [];

      // Try each backup playlist until we get enough tracks
      for (const playlistId of RAPFR_BACKUP_PLAYLISTS) {
        const tracks = await fetchPlaylist(playlistId);
        if (tracks && tracks.length > 0) {
          tracksWithPreview = tracks;
          console.log(`Rap FR: Found ${tracks.length} tracks from playlist ${playlistId}`);
          break;
        }
      }

      if (tracksWithPreview.length < 5) {
        return res.status(200).json({
          success: false,
          error: 'Not enough French rap tracks found',
          tracks: [],
        });
      }

      // Shuffle and transform
      const shuffledTracks = [...tracksWithPreview].sort(() => Math.random() - 0.5);
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

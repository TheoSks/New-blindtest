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

// French rap artist IDs on Deezer (verified IDs)
const FRENCH_RAP_ARTISTS: { name: string; id: number }[] = [
  { name: 'Booba', id: 544 },
  { name: 'Ninho', id: 6575813 },
  { name: 'Jul', id: 5313805 },
  { name: 'SCH', id: 4932985 },
  { name: 'Damso', id: 6824757 },
  { name: 'PNL', id: 4412926 },
  { name: 'Nekfeu', id: 4261483 },
  { name: 'Orelsan', id: 50182 },
  { name: 'Niska', id: 7622383 },
  { name: 'Maes', id: 9635624 },
  { name: 'Kaaris', id: 1819753 },
  { name: 'Vald', id: 5505679 },
  { name: 'Lacrim', id: 1523614 },
  { name: 'PLK', id: 9282498 },
  { name: 'Naps', id: 5266132 },
  { name: 'Alonzo', id: 419118 },
  { name: 'La Fouine', id: 1179 },
  { name: 'Rohff', id: 1087 },
  { name: 'Gradur', id: 5312302 },
  { name: 'Soprano', id: 428 },
  { name: 'Gims', id: 1308916 },
  { name: 'Koba LaD', id: 11276023 },
  { name: 'Gazo', id: 55776442 },
  { name: 'Tiakola', id: 77287382 },
  { name: 'SDM', id: 8523523 },
];

interface DeezerTopTracksResponse {
  data: DeezerTrack[];
}

// Get top tracks for a French rap artist by ID
async function getArtistTopTracks(artistId: number): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/artist/${artistId}/top?limit=10`
    );
    if (!response.ok) return [];
    const data: DeezerTopTracksResponse = await response.json();
    if (!data.data) return [];

    // Only keep tracks with preview URL
    return data.data.filter(track => track.preview);
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
    // Special handling for French Rap - get top tracks from verified French rap artists
    if (genreKey === 'rapfr') {
      // Pick random artists
      const shuffledArtists = [...FRENCH_RAP_ARTISTS].sort(() => Math.random() - 0.5);
      const selectedArtists = shuffledArtists.slice(0, 12);

      // Get top tracks from each artist in parallel
      const trackPromises = selectedArtists.map(artist => getArtistTopTracks(artist.id));
      const trackResults = await Promise.all(trackPromises);

      // Combine all tracks
      const allTracks = trackResults.flat();

      // Remove duplicates by track ID
      const seenIds = new Set<number>();
      const uniqueTracks = allTracks.filter(track => {
        if (seenIds.has(track.id)) return false;
        seenIds.add(track.id);
        return true;
      });

      console.log(`Rap FR: Found ${uniqueTracks.length} unique tracks from ${selectedArtists.length} artists`);

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

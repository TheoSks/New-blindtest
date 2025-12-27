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

// French rap artists with their Deezer artist IDs for precise matching
const FRENCH_RAP_ARTISTS: { name: string; id: number }[] = [
  { name: 'Booba', id: 202 },
  { name: 'PNL', id: 4468629 },
  { name: 'Ninho', id: 6608778 },
  { name: 'Jul', id: 1424602 },
  { name: 'Nekfeu', id: 4062703 },
  { name: 'Orelsan', id: 50182 },
  { name: 'Damso', id: 5313805 },
  { name: 'SCH', id: 5765954 },
  { name: 'Freeze Corleone', id: 12246167 },
  { name: 'Gazo', id: 68831492 },
  { name: 'Lacrim', id: 1744753 },
  { name: 'Kaaris', id: 1623876 },
  { name: 'Maes', id: 12039255 },
  { name: 'Niska', id: 5994328 },
  { name: 'Leto', id: 10531086 },
  { name: 'PLK', id: 9635498 },
  { name: 'Koba LaD', id: 12343104 },
  { name: 'Soolking', id: 4904356 },
  { name: 'Heuss L\'enfoire', id: 11227614 },
  { name: 'Dinos', id: 4931498 },
  { name: 'Laylow', id: 9203654 },
  { name: 'Alpha Wann', id: 389138 },
  { name: 'La Fouine', id: 1175 },
  { name: 'Rohff', id: 835 },
  { name: 'Gradur', id: 4932196 },
  { name: 'SDM', id: 11444436 },
  { name: 'Tiakola', id: 67408082 },
  { name: 'Werenoi', id: 14278327 },
  { name: 'Ziak', id: 15519498 },
  { name: 'Hamza', id: 4578498 },
  { name: 'Dosseh', id: 4118128 },
  { name: 'Rim\'K', id: 1084 },
  { name: 'Alonzo', id: 1259425 },
  { name: 'Sofiane', id: 5608050 },
  { name: 'Vald', id: 5542192 },
  { name: 'Josman', id: 11940498 },
  { name: 'Zola', id: 11939952 },
  { name: 'Guy2bezbar', id: 57181132 },
  { name: 'Rsko', id: 69231622 },
  { name: 'Nej', id: 68709342 },
  { name: 'Naps', id: 7276238 },
  { name: 'Gims', id: 1069498 },
  { name: 'Dadju', id: 5413498 },
  { name: 'Fianso', id: 5608050 },
  { name: 'Hornet La Frappe', id: 9636882 },
];

// Fetch top tracks for a French rap artist by ID
async function fetchArtistTopTracks(artistId: number, artistName: string): Promise<DeezerTrack[]> {
  try {
    const response = await fetch(
      `https://api.deezer.com/artist/${artistId}/top?limit=15`
    );
    if (!response.ok) return [];
    const data: DeezerSearchResponse = await response.json();

    // Filter to only include tracks where this artist is the main artist
    const tracks = (data.data || []).filter(track =>
      track.artist.name.toLowerCase() === artistName.toLowerCase() ||
      track.artist.name.toLowerCase().includes(artistName.toLowerCase())
    );

    return tracks;
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
      const selectedArtists = shuffledArtists.slice(0, 12);

      // Fetch tracks from multiple artists in parallel using their IDs
      const artistTracksPromises = selectedArtists.map(artist =>
        fetchArtistTopTracks(artist.id, artist.name)
      );
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

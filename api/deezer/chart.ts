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

interface DeezerChartResponse {
  data: DeezerTrack[];
  total: number;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Fetch top tracks from Deezer chart
    const response = await fetch('https://api.deezer.com/chart/0/tracks?limit=100');

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }

    const data: DeezerChartResponse = await response.json();

    // Filter tracks that have a preview URL
    const tracksWithPreview = data.data.filter(track => track.preview);

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
      tracks,
    });
  } catch (error) {
    console.error('Deezer API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracks from Deezer',
    });
  }
}

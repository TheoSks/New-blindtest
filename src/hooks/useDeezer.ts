import { useState, useCallback } from 'react';

export interface DeezerTrack {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  albumCover: string;
}

interface DeezerResponse {
  success: boolean;
  tracks: DeezerTrack[];
  playlist?: string;
  error?: string;
}

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000' : '';

export function useDeezer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async (): Promise<DeezerTrack[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/deezer/chart`);
      const data: DeezerResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch chart');
      }

      return data.tracks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tracks';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPlaylist = useCallback(async (genre?: string): Promise<DeezerTrack[]> => {
    setLoading(true);
    setError(null);

    try {
      const url = genre
        ? `${API_BASE}/api/deezer/playlist?genre=${encodeURIComponent(genre)}`
        : `${API_BASE}/api/deezer/playlist`;

      const response = await fetch(url);
      const data: DeezerResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch playlist');
      }

      return data.tracks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playlist';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const searchTracks = useCallback(async (query: string): Promise<DeezerTrack[]> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/deezer/search?q=${encodeURIComponent(query)}`
      );
      const data: DeezerResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to search tracks');
      }

      return data.tracks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search tracks';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get random tracks for a blind test game
  const getRandomTracks = useCallback(async (count: number = 10, genre?: string): Promise<DeezerTrack[]> => {
    const tracks = genre ? await fetchPlaylist(genre) : await fetchChart();

    if (tracks.length === 0) {
      return [];
    }

    // Shuffle and take requested count
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }, [fetchChart, fetchPlaylist]);

  return {
    loading,
    error,
    fetchChart,
    fetchPlaylist,
    searchTracks,
    getRandomTracks,
  };
}

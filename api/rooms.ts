import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory storage (use Vercel KV or Upstash Redis in production)
const rooms: Map<string, {
  code: string;
  host: string;
  players: number;
  maxPlayers: number;
  theme: string;
  isPublic: boolean;
  createdAt: number;
}> = new Map();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Get public rooms
    const publicRooms = Array.from(rooms.values())
      .filter(room => room.isPublic)
      .map(room => ({
        code: room.code,
        host: room.host,
        players: room.players,
        maxPlayers: room.maxPlayers,
        theme: room.theme,
      }));

    return res.status(200).json({ rooms: publicRooms });
  }

  if (req.method === 'POST') {
    const { code, host, isPublic = true, theme = 'Mixed' } = req.body;

    if (!code || !host) {
      return res.status(400).json({ error: 'Missing code or host' });
    }

    rooms.set(code, {
      code,
      host,
      players: 1,
      maxPlayers: 8,
      theme,
      isPublic,
      createdAt: Date.now(),
    });

    // Clean up old rooms (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, room] of rooms) {
      if (room.createdAt < oneHourAgo) {
        rooms.delete(key);
      }
    }

    return res.status(201).json({ success: true, room: rooms.get(code) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

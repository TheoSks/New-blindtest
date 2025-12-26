import Ably from 'ably';

const ABLY_API_KEY = import.meta.env.VITE_ABLY_API_KEY;

let ablyClient: Ably.Realtime | null = null;

export function getAblyClient(clientId: string): Ably.Realtime {
  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: ABLY_API_KEY,
      clientId,
    });
  }
  return ablyClient;
}

export function getChannel(channelName: string): Ably.RealtimeChannel | null {
  if (!ablyClient) return null;
  return ablyClient.channels.get(channelName);
}

export function closeConnection() {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
  }
}

// Room channel helpers
export function getRoomChannel(roomCode: string): Ably.RealtimeChannel | null {
  return getChannel(`room:${roomCode}`);
}

// Message types for the game
export interface RoomMessage {
  type:
    | 'player-joined'
    | 'player-left'
    | 'game-starting'
    | 'round-start'
    | 'player-found'
    | 'answer-result'
    | 'round-end'
    | 'game-end'
    | 'chat';
  data: unknown;
  senderId: string;
  timestamp: number;
}

export function publishToRoom(roomCode: string, message: RoomMessage) {
  const channel = getRoomChannel(roomCode);
  if (channel) {
    channel.publish('game-event', message);
  }
}

export function subscribeToRoom(
  roomCode: string,
  callback: (message: RoomMessage) => void
) {
  const channel = getRoomChannel(roomCode);
  if (channel) {
    channel.subscribe('game-event', (ablyMessage) => {
      callback(ablyMessage.data as RoomMessage);
    });
  }
}

export function unsubscribeFromRoom(roomCode: string) {
  const channel = getRoomChannel(roomCode);
  if (channel) {
    channel.unsubscribe();
  }
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  gamesWon: number;
  totalCorrect: number;
  totalAnswers: number;
  bestStreak: number;
  currentStreak: number;
  createdAt: Date;
}

export interface GuestPlayer {
  id: string;
  name: string;
  isGuest: true;
}

export type Player = {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isGuest: boolean;
  avatar?: string;
};

// Room types
export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'round_end' | 'finished';

export interface RoomSettings {
  rounds: number;
  timePerRound: number;
  playlistIds: string[];
  answerMode: 'artist' | 'title' | 'both';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  allowHints: boolean;
  isPublic: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  totalRounds: number;
}

// Game types
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre: string[];
  previewUrl: string;
  coverUrl?: string;
}

export interface RoundData {
  round: number;
  totalRounds: number;
  previewUrl: string;
  category?: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  result: 'title' | 'artist' | 'both' | 'wrong';
  points: number;
  totalScore: number;
  responseTime: number;
}

export interface RoundResult {
  correctAnswer: {
    title: string;
    artist: string;
  };
  leaderboard: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  rank?: number;
}

// Socket events
export interface ServerToClientEvents {
  'room:created': (data: { code: string; room: Room }) => void;
  'room:joined': (data: { room: Room; players: Player[] }) => void;
  'room:player-joined': (data: { player: Player }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'room:updated': (data: { room: Room }) => void;
  'game:starting': (data: { countdown: number }) => void;
  'game:round-start': (data: RoundData) => void;
  'game:player-found': (data: { playerId: string; time: number }) => void;
  'game:answer-result': (data: AnswerResult) => void;
  'game:round-end': (data: RoundResult) => void;
  'game:end': (data: { leaderboard: LeaderboardEntry[] }) => void;
  'chat:message': (data: { playerId: string; playerName: string; content: string; timestamp: number }) => void;
  'error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'room:create': (data: { settings: Partial<RoomSettings>; playerName: string }) => void;
  'room:join': (data: { code: string; playerName: string }) => void;
  'room:leave': () => void;
  'room:kick': (data: { playerId: string }) => void;
  'room:update-settings': (data: { settings: Partial<RoomSettings> }) => void;
  'game:start': () => void;
  'game:answer': (data: { answer: string; timestamp: number }) => void;
  'game:skip': () => void;
  'chat:message': (data: { content: string }) => void;
}

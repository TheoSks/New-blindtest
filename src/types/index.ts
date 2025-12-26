export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'round_end' | 'finished';

export interface RoomSettings {
  rounds: number;
  timePerRound: number;
  answerMode: 'artist' | 'title' | 'both';
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

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string[];
  previewUrl: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  result: 'title' | 'artist' | 'both' | 'wrong';
  points: number;
  totalScore: number;
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

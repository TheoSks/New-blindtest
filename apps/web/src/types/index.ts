// Re-export shared types
export type {
  User,
  GuestPlayer,
  Player,
  RoomStatus,
  RoomSettings,
  Room,
  Song,
  RoundData,
  AnswerResult,
  RoundResult,
  LeaderboardEntry,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../../../../packages/shared/types';

// Frontend-specific types
export interface AuthState {
  user: import('../../../../packages/shared/types').User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestName: string | null;
  isLoading: boolean;
}

export interface GameState {
  room: import('../../../../packages/shared/types').Room | null;
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  isPlaying: boolean;
  hasAnswered: boolean;
  myScore: number;
  lastAnswer: import('../../../../packages/shared/types').AnswerResult | null;
}

export interface UIState {
  isSidebarOpen: boolean;
  isAudioMuted: boolean;
  volume: number;
  showChat: boolean;
}

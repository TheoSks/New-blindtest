import { create } from 'zustand';

interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isGuest: boolean;
  avatar?: string;
}

interface RoomSettings {
  rounds: number;
  timePerRound: number;
  answerMode: 'artist' | 'title' | 'both';
  isPublic: boolean;
}

interface Room {
  code: string;
  hostId: string;
  status: 'waiting' | 'starting' | 'playing' | 'round_end' | 'finished';
  settings: RoomSettings;
  players: Player[];
  currentRound: number;
  totalRounds: number;
}

interface AnswerResult {
  isCorrect: boolean;
  result: 'title' | 'artist' | 'both' | 'wrong';
  points: number;
  totalScore: number;
}

interface RoundResult {
  correctAnswer: {
    title: string;
    artist: string;
  };
  leaderboard: { name: string; score: number }[];
}

interface GameState {
  room: Room | null;
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  isPlaying: boolean;
  hasAnswered: boolean;
  myScore: number;
  currentAudioUrl: string | null;
  lastAnswer: AnswerResult | null;
  roundResult: RoundResult | null;
  finalLeaderboard: { name: string; score: number }[] | null;

  // Actions
  setRoom: (room: Room | null) => void;
  updatePlayers: (players: Player[]) => void;
  startGame: (totalRounds: number) => void;
  startRound: (round: number, audioUrl: string, timePerRound: number) => void;
  setTimeRemaining: (time: number) => void;
  submitAnswer: (result: AnswerResult) => void;
  endRound: (result: RoundResult) => void;
  endGame: (leaderboard: { name: string; score: number }[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  currentRound: 0,
  totalRounds: 0,
  timeRemaining: 0,
  isPlaying: false,
  hasAnswered: false,
  myScore: 0,
  currentAudioUrl: null,
  lastAnswer: null,
  roundResult: null,
  finalLeaderboard: null,

  setRoom: (room) => set({ room }),

  updatePlayers: (players) =>
    set((state) => ({
      room: state.room ? { ...state.room, players } : null,
    })),

  startGame: (totalRounds) =>
    set({
      isPlaying: true,
      totalRounds,
      currentRound: 0,
      myScore: 0,
      finalLeaderboard: null,
    }),

  startRound: (round, audioUrl, timePerRound) =>
    set({
      currentRound: round,
      currentAudioUrl: audioUrl,
      timeRemaining: timePerRound,
      hasAnswered: false,
      lastAnswer: null,
      roundResult: null,
    }),

  setTimeRemaining: (time) => set({ timeRemaining: time }),

  submitAnswer: (result) =>
    set({
      hasAnswered: true,
      lastAnswer: result,
      myScore: result.totalScore,
    }),

  endRound: (result) =>
    set({
      roundResult: result,
    }),

  endGame: (leaderboard) =>
    set({
      isPlaying: false,
      finalLeaderboard: leaderboard,
    }),

  resetGame: () =>
    set({
      room: null,
      currentRound: 0,
      totalRounds: 0,
      timeRemaining: 0,
      isPlaying: false,
      hasAnswered: false,
      myScore: 0,
      currentAudioUrl: null,
      lastAnswer: null,
      roundResult: null,
      finalLeaderboard: null,
    }),
}));

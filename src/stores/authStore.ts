import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerStats {
  xp: number;
  level: number;
  gamesPlayed: number;
  totalCorrect: number;
  bestScore: number;
  currentStreak: number;
  bestStreak: number;
}

interface AuthState {
  guestName: string | null;
  stats: PlayerStats;
  isGuest: boolean;

  // Actions
  setGuestName: (name: string) => void;
  addXp: (amount: number) => void;
  incrementGamesPlayed: () => void;
  incrementCorrectAnswers: (count: number) => void;
  updateBestScore: (score: number) => void;
  updateStreak: (correct: boolean) => void;
  resetStreak: () => void;
  logout: () => void;
}

// Calculate level from XP
function calculateLevel(xp: number): number {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

// XP needed for next level
export function xpForNextLevel(level: number): number {
  return level * level * 100;
}

// XP needed for current level
export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
}

const initialStats: PlayerStats = {
  xp: 0,
  level: 1,
  gamesPlayed: 0,
  totalCorrect: 0,
  bestScore: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      guestName: null,
      stats: initialStats,
      isGuest: false,

      setGuestName: (name) =>
        set({
          guestName: name,
          isGuest: true,
        }),

      addXp: (amount) =>
        set((state) => {
          const newXp = state.stats.xp + amount;
          const newLevel = calculateLevel(newXp);
          return {
            stats: {
              ...state.stats,
              xp: newXp,
              level: newLevel,
            },
          };
        }),

      incrementGamesPlayed: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            gamesPlayed: state.stats.gamesPlayed + 1,
          },
        })),

      incrementCorrectAnswers: (count) =>
        set((state) => ({
          stats: {
            ...state.stats,
            totalCorrect: state.stats.totalCorrect + count,
          },
        })),

      updateBestScore: (score) =>
        set((state) => ({
          stats: {
            ...state.stats,
            bestScore: Math.max(state.stats.bestScore, score),
          },
        })),

      updateStreak: (correct) =>
        set((state) => {
          if (correct) {
            const newStreak = state.stats.currentStreak + 1;
            return {
              stats: {
                ...state.stats,
                currentStreak: newStreak,
                bestStreak: Math.max(state.stats.bestStreak, newStreak),
              },
            };
          }
          return {
            stats: {
              ...state.stats,
              currentStreak: 0,
            },
          };
        }),

      resetStreak: () =>
        set((state) => ({
          stats: {
            ...state.stats,
            currentStreak: 0,
          },
        })),

      logout: () =>
        set({
          guestName: null,
          isGuest: false,
          // Keep stats!
        }),
    }),
    {
      name: 'blindtest-save',
      partialize: (state) => ({
        guestName: state.guestName,
        stats: state.stats,
        isGuest: state.isGuest,
      }),
    }
  )
);

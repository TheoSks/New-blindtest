// Scoring constants
export const SCORING = {
  BASE_POINTS: 1000,
  MAX_TIME_BONUS: 500,
  MAX_STREAK_BONUS: 250,
  STREAK_BONUS_PER_STREAK: 50,
  TITLE_ONLY_MULTIPLIER: 0.5,
  ARTIST_ONLY_MULTIPLIER: 0.5,
} as const;

// Game constants
export const GAME = {
  MIN_ROUNDS: 5,
  MAX_ROUNDS: 30,
  DEFAULT_ROUNDS: 15,
  MIN_TIME_PER_ROUND: 10,
  MAX_TIME_PER_ROUND: 60,
  DEFAULT_TIME_PER_ROUND: 30,
  MIN_PLAYERS: 1,
  MAX_PLAYERS: 16,
  COUNTDOWN_DURATION: 5,
  ROUND_END_DURATION: 5,
} as const;

// XP and levels
export const XP = {
  CORRECT_ANSWER: 10,
  FAST_ANSWER: 15,
  WIN_MULTIPLAYER: 50,
  TOP_3_MULTIPLAYER: 25,
  COMPLETE_GAME: 20,
  DAILY_CHALLENGE_COMPLETE: 100,
  DAILY_CHALLENGE_FIRST: 200,
} as const;

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Débutant',
  5: 'Amateur',
  10: 'Connaisseur',
  20: 'Expert',
  35: 'Maître',
  50: 'Légende',
  75: 'Mythique',
  100: 'Immortel',
};

// Room code generation
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Badges
export const BADGE_CATEGORIES = ['progression', 'performance', 'genre', 'social', 'special'] as const;
export const BADGE_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestName: string | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setGuestName: (name: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      guestName: null,
      isLoading: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isGuest: false,
        }),

      setGuestName: (name) =>
        set({
          guestName: name,
          isGuest: true,
          isAuthenticated: false,
        }),

      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
          guestName: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'blindtest-auth',
      partialize: (state) => ({
        guestName: state.guestName,
      }),
    }
  )
);

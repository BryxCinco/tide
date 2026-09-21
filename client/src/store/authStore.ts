import { create } from 'zustand';

import { mockUser } from '../mocks/mockUser';
import type { User } from '../types/user';
import { guestStorage } from '../utils/guestStorage';
import { storage } from '../utils/storage';

const TOKEN_KEY = 'tide_auth_token';
const USER_KEY = 'tide_auth_user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  linkGuestToAccount: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  /** Patches the current user in place (avatar/bio/cover edits from the Dashboard/Profile) —
   * a no-op when signed out. Persists immediately so a reload doesn't lose the change. */
  updateUser: (updates: Partial<Pick<User, 'name' | 'avatar' | 'bio' | 'coverType' | 'coverValue'>>) => void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.';
}

async function persistSession(user: User, token: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
  await storage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Mock auth store — no backend yet. `login`/`register`/`loginAsGuest` always
 * succeed after a simulated delay; `error`/`clearError` exist for the real
 * API integration later.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: false,
  error: null,

  login: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await wait(800);

      const user: User = { ...mockUser, email, isGuest: false };
      const token = `mock_jwt_${Date.now()}`;
      await persistSession(user, token);

      set({ user, token, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ error: toErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  register: async (name, email) => {
    set({ isLoading: true, error: null });
    try {
      await wait(1000);

      const user: User = {
        id: `user_${Date.now()}`,
        name,
        email,
        createdAt: new Date().toISOString(),
        isGuest: false,
      };
      const token = `mock_jwt_${Date.now()}`;
      await persistSession(user, token);

      set({ user, token, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ error: toErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    try {
      await wait(400);

      const user: User = {
        id: `guest_${Date.now()}`,
        name: 'Guest',
        email: '',
        createdAt: new Date().toISOString(),
        isGuest: true,
      };
      // Guests still get a token so restoreSession() persists them across app restarts,
      // exactly like a real account — "device only" refers to where the data lives, not
      // whether the session survives a reload.
      const token = `mock_guest_token_${Date.now()}`;
      await persistSession(user, token);

      set({ user, token, isAuthenticated: true, isGuest: true, isLoading: false });
    } catch (err) {
      set({ error: toErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  linkGuestToAccount: async (name, email) => {
    const guestUser = get().user;
    set({ isLoading: true, error: null });
    try {
      await wait(1000);

      const userId = `user_${Date.now()}`;
      await guestStorage.migrateToAccount(userId);
      await guestStorage.clearGuestData();

      const user: User = {
        id: userId,
        name,
        email,
        createdAt: guestUser?.createdAt ?? new Date().toISOString(),
        isGuest: false,
      };
      const token = `mock_jwt_${Date.now()}`;
      await persistSession(user, token);

      set({ user, token, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ error: toErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const wasGuest = get().isGuest;

    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    if (wasGuest) {
      await guestStorage.clearGuestData();
    }

    set({ user: null, token: null, isAuthenticated: false, isGuest: false });
  },

  restoreSession: async () => {
    const [token, rawUser] = await Promise.all([storage.getItem(TOKEN_KEY), storage.getItem(USER_KEY)]);
    if (!token || !rawUser) return;

    try {
      const user: User = JSON.parse(rawUser);
      set({ user, token, isAuthenticated: true, isGuest: Boolean(user.isGuest) });
    } catch {
      await storage.removeItem(TOKEN_KEY);
      await storage.removeItem(USER_KEY);
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const user: User = { ...current, ...updates };
    storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));

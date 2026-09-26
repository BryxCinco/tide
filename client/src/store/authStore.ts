import { create } from 'zustand';

import { AUTH_TOKEN_KEY, AUTH_USER_KEY, getApiErrorMessage, onUnauthorized } from '../services/api';
import { authService, mapProfileToUser } from '../services/auth.service';
import { signInWithGoogle } from '../services/googleAuth.service';
import { profileService, type UpdateProfilePayload } from '../services/profile.service';
import type { User } from '../types/user';
import { guestStorage } from '../utils/guestStorage';
import { storage } from '../utils/storage';
import { useActivityStore } from './activityStore';
import { useJournalStore } from './journalStore';
import { useQuestStore } from './questStore';
import { useTaskStore } from './taskStore';
import { useTimerStore } from './timerStore';

const TOKEN_KEY = AUTH_TOKEN_KEY;
const USER_KEY = AUTH_USER_KEY;

/**
 * taskStore/journalStore/activityStore/questStore each persist to a single, non-user-scoped
 * localStorage key ('tide_tasks', 'tide_journal', etc.) — nothing about their storage key
 * changes based on who's logged in. timerStore isn't persisted at all, but its in-memory
 * state can still carry over within the same tab session. Without this, a new signup (or a
 * second account) on a browser/device that was used before would silently inherit whatever
 * the previous session left behind. Called before a fresh login/register (defensive, in
 * case a previous session wasn't cleanly logged out) and on logout (so the next login,
 * whoever it is, starts clean) — deliberately NOT called from restoreSession(), which is
 * the same already-authenticated user reopening the app and should keep its cache.
 */
function resetDomainStores(): void {
  useTaskStore.getState().reset();
  useJournalStore.getState().reset();
  useActivityStore.getState().reset();
  useQuestStore.getState().reset();
  useTimerStore.getState().resetAccountData();
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Google OAuth via Supabase (see services/googleAuth.service.ts). A no-op that leaves
   * isAuthenticated false — not an error — if the user cancels the browser popup. */
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  linkGuestToAccount: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  /** LOCAL ONLY — patches the current user in the store + the local cache, no backend call.
   * Guest accounts (no real backend profile to sync) go through this directly; real
   * accounts should go through `syncProfile` below instead, which calls this internally
   * once the server confirms the write. Calling this alone for a real account is exactly
   * the bug this app used to have: the change shows immediately but silently reverts on
   * the next login, since nothing told the server about it. */
  updateUser: (updates: Partial<Pick<User, 'name' | 'avatar' | 'bio' | 'coverType' | 'coverValue'>>) => void;
  /** The real write path for profile/avatar/cover edits (userStore.ts's public actions all
   * route through this). Real accounts: PATCH /api/profile via profileService, then adopt
   * the server's own returned row as the new local state — only after the request
   * succeeds, so a failed save can't leave the UI showing something the backend never
   * persisted. Guest accounts have no backend profile to sync, so they fall back to the
   * local-only `updateUser` unconditionally. `null` on a field clears it server-side;
   * omit a field entirely to leave it untouched (see profile.service.ts). */
  syncProfile: (updates: UpdateProfilePayload) => Promise<void>;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function persistSession(user: User, token: string): Promise<void> {
  await storage.setItem(TOKEN_KEY, token);
  await storage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Real accounts (login/register/logout/restoreSession) go through the backend API via
 * authService. Guest mode (loginAsGuest/linkGuestToAccount) stays local-only mock — there's
 * no backend concept of a guest account (Supabase Auth needs real credentials), and nothing
 * in this pass asked for that to change.
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    resetDomainStores();
    try {
      const { session } = await authService.login(email, password);
      if (!session?.access_token) {
        throw new Error('Login succeeded but no session was returned.');
      }

      // Persisted before the /me call below so the request interceptor (which reads the
      // token from storage, not from this store) attaches the fresh token to it.
      await storage.setItem(TOKEN_KEY, session.access_token);
      const { profile } = await authService.me();
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));

      set({ user, token: session.access_token, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    resetDomainStores();
    try {
      const { session } = await authService.signup(email, password, name);
      if (!session?.access_token) {
        // "Confirm email" is off in this project's dev config, so signup always returns a
        // session immediately. If it's ever turned back on, session comes back null instead
        // and the account needs email confirmation before it can log in.
        throw new Error('Account created! Check your email to confirm it, then sign in.');
      }

      await storage.setItem(TOKEN_KEY, session.access_token);
      const { profile } = await authService.me();
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));

      set({ user, token: session.access_token, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      // resetDomainStores() is deliberately deferred until a session actually comes back —
      // a cancelled browser popup shouldn't wipe whatever's currently loaded locally.
      const tokens = await signInWithGoogle();
      if (!tokens) {
        set({ isLoading: false });
        return;
      }

      resetDomainStores();

      // Persisted before the /me call below so the request interceptor (which reads the
      // token from storage, not from this store) attaches the fresh token to it — same
      // ordering login() uses above.
      await storage.setItem(TOKEN_KEY, tokens.accessToken);
      const { profile } = await authService.me();
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));

      set({ user, token: tokens.accessToken, isAuthenticated: true, isGuest: false, isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    resetDomainStores();
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
      set({ error: getApiErrorMessage(err), isLoading: false });
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
      set({ error: getApiErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const wasGuest = get().isGuest;

    if (!wasGuest) {
      // Best-effort server-side revoke — local logout must succeed either way (expired
      // token, offline, whatever), so a failure here is swallowed rather than blocking it.
      try {
        await authService.logout();
      } catch {
        // ignored
      }
    }

    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    if (wasGuest) {
      await guestStorage.clearGuestData();
    }
    resetDomainStores();

    set({ user: null, token: null, isAuthenticated: false, isGuest: false });
  },

  restoreSession: async () => {
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) return;

    const rawUser = await storage.getItem(USER_KEY);
    let cachedUser: User | null = null;
    try {
      cachedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      cachedUser = null;
    }

    // Guests never touch the backend — the local cache is the only copy that exists.
    if (cachedUser?.isGuest) {
      set({ user: cachedUser, token, isAuthenticated: true, isGuest: true });
      return;
    }

    // Show the cached profile immediately (instant on relaunch instead of a loading
    // screen), then verify the token and refresh the profile in the background.
    if (cachedUser) {
      set({ user: cachedUser, token, isAuthenticated: true, isGuest: false });
    }

    try {
      const { profile } = await authService.me();
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isGuest: false });
    } catch {
      // An invalid/expired token (401) is already handled globally by the response
      // interceptor, which clears storage and calls onUnauthorized -> logout() below. Any
      // other failure (e.g. offline) just leaves the cached user shown above in place.
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

  syncProfile: async (updates) => {
    if (get().isGuest) {
      // No backend profile to sync — null (an explicit "clear") reads the same as
      // undefined for the local-only merge in updateUser, so it's fine to pass through as-is.
      get().updateUser(updates as Partial<Pick<User, 'name' | 'avatar' | 'bio' | 'coverType' | 'coverValue'>>);
      return;
    }

    // The server's response (profileService.update already maps it through
    // mapProfileToUser) becomes the new local user wholesale, rather than merging `updates`
    // in by hand — that keeps this the single source of truth for what actually got saved
    // instead of the client's own guess of it.
    const user = await profileService.update(updates);
    await storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));

// A 401 from any API call (expired/invalid token) clears storage in the interceptor itself,
// then lands here to reset in-memory state too — the Stack.Protected guard in app/_layout.tsx
// reacts to isAuthenticated flipping false and swaps to the (auth) screens on its own, so no
// imperative redirect is needed here.
onUnauthorized(() => {
  resetDomainStores();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isGuest: false });
});

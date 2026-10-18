import { create } from 'zustand';

import { AUTH_REFRESH_KEY, AUTH_TOKEN_KEY, AUTH_USER_KEY, getApiErrorMessage, onTokenRefreshed, onUnauthorized, registerTokenGetter } from '../services/api';
import { authService, mapProfileToUser } from '../services/auth.service';
import {
  hasOnlyGoogleIdentity,
  onGoogleSignIn,
  onGoogleTokenRefresh,
  setSupabasePassword,
  signInWithGoogle,
  type GoogleSessionTokens,
} from '../services/googleAuth.service';
import { profileService, type UpdateProfilePayload } from '../services/profile.service';
import type { User } from '../types/user';
import { setGuestMode, setHasAuthToken } from '../utils/authFlags';
import { guestStorage } from '../utils/guestStorage';
import { storage } from '../utils/storage';
import { useActivityStore } from './activityStore';
import { useJournalStore } from './journalStore';
import { useLevelStore } from './levelStore';
import { useQuestStore } from './questStore';
import { useSettingsStore } from './settingsStore';
import { useTaskStore } from './taskStore';
import { useTimerStore } from './timerStore';

const TOKEN_KEY = AUTH_TOKEN_KEY;
const USER_KEY = AUTH_USER_KEY;

// Keyed per-user (not a single flag) so a shared device logging into a different Google
// account doesn't inherit someone else's "don't ask me again" decision.
function passwordPromptedKey(userId: string): string {
  return `tide_password_prompted_${userId}`;
}

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
  useLevelStore.getState().reset();
  useSettingsStore.getState().resetSettings();
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  /** True once completeGoogleSignIn finds this is a Google-only account (no password set)
   * that hasn't already skipped the prompt this device — SetPasswordModal (mounted once in
   * app/_layout.tsx, same pattern as Toast) watches this directly. */
  needsPasswordSetup: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Starts Google OAuth (see services/googleAuth.service.ts). On web this resolves almost
   * immediately, before the tab navigates away — it does NOT mean the user is signed in
   * yet. A no-op that resets isLoading without error if the user cancels on native. The
   * actual sign-in always completes through completeGoogleSignIn below, however long that
   * takes — driven by an event listener, not by this function's return. */
  loginWithGoogle: () => Promise<void>;
  /** Registered with googleAuth.service.ts's onGoogleSignIn — fires once Supabase actually
   * hands back a session, on both platforms (see that file's comment for why this can't
   * just be inline in loginWithGoogle). Not meant to be called directly by UI code. */
  completeGoogleSignIn: (tokens: GoogleSessionTokens) => Promise<void>;
  /** SetPasswordModal's "Set Password" action — sets the password on the live Supabase
   * session, then marks this user as prompted so it never shows again. */
  setPassword: (password: string) => Promise<void>;
  /** SetPasswordModal's "Skip for now" (and its backdrop/close) — just marks this user as
   * prompted without setting anything. */
  skipPasswordSetup: () => Promise<void>;
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

/** Stores (or, when the session didn't include one, clears) the email/password refresh
 * token — see AUTH_REFRESH_KEY in api.ts. */
async function storeRefreshToken(refreshToken: string | undefined): Promise<void> {
  if (refreshToken) await storage.setItem(AUTH_REFRESH_KEY, refreshToken);
  else await storage.removeItem(AUTH_REFRESH_KEY);
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
  needsPasswordSetup: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    resetDomainStores();
    try {
      const { session } = await authService.login(email, password);
      if (!session?.access_token) {
        throw new Error('Login succeeded but no session was returned.');
      }

      // Persisted before the /me call below so the request interceptor (which reads the
      // token from storage, not from this store) attaches the fresh token to it. The refresh
      // token is what lets api.ts renew the session when the access token expires (~1 hour).
      await storage.setItem(TOKEN_KEY, session.access_token);
      await storeRefreshToken(session.refresh_token);
      const { profile } = await authService.me();
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));

      set({ user, token: session.access_token, isAuthenticated: true, isGuest: false, isLoading: false });
      // Fire-and-forget — resetDomainStores() just wiped settingsStore back to defaults;
      // this loads this account's real theme/language/sound so they don't sit on defaults
      // until the user happens to open Profile.
      useSettingsStore.getState().fetchSettings();
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
      await storeRefreshToken(session.refresh_token);
      const { profile } = await authService.me();
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));

      set({ user, token: session.access_token, isAuthenticated: true, isGuest: false, isLoading: false });
      useSettingsStore.getState().fetchSettings();
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async () => {
    // Only ever reachable today from login.tsx's explicit "Continue with Google" button tap
    // — this guard just makes that invariant load-bearing instead of implicit, so a stray
    // call during an auth-state transition (e.g. a leftover handler reference firing a beat
    // after logout, before isAuthenticated has actually flipped false) can never pop the
    // Google account picker open on someone who didn't just ask for it.
    if (get().isAuthenticated) {
      console.log('[OAuth Debug] authStore.loginWithGoogle() called while already authenticated — ignoring.');
      return;
    }
    console.log('[OAuth Debug] authStore.loginWithGoogle() called.');
    set({ isLoading: true, error: null });
    try {
      const started = await signInWithGoogle();
      console.log('[OAuth Debug] authStore.loginWithGoogle(): signInWithGoogle() returned', started);
      if (!started) {
        // Native cancel — nothing else will ever complete this, so reset here. On web,
        // `started` is always true and the tab is already navigating away by this point;
        // isLoading is deliberately left true (completeGoogleSignIn resets it once the
        // sign-in genuinely finishes, on the other side of that navigation).
        set({ isLoading: false });
      }
      console.log('[OAuth Debug] authStore.loginWithGoogle() end.');
    } catch (err) {
      console.log('[OAuth Debug] authStore.loginWithGoogle() FAILED:', err);
      set({ error: getApiErrorMessage(err), isLoading: false });
      throw err;
    }
  },

  completeGoogleSignIn: async (tokens) => {
    console.log('[OAuth Debug] completeGoogleSignIn called with tokens:', {
      accessTokenPrefix: `${tokens.accessToken.slice(0, 12)}...`,
      hasRefreshToken: Boolean(tokens.refreshToken),
    });
    try {
      resetDomainStores();

      // Persisted before the /me call below so the request interceptor (which reads the
      // token from storage, not from this store) attaches the fresh token to it — same
      // ordering login() uses above.
      await storage.setItem(TOKEN_KEY, tokens.accessToken);
      // supabase-js owns refreshing Google sessions (onGoogleTokenRefresh below); a leftover
      // email/password refresh token must not be used against this session.
      await storage.removeItem(AUTH_REFRESH_KEY);
      console.log('[OAuth Debug] token persisted to storage, calling /api/auth/me...');
      const { profile } = await authService.me();
      console.log('[OAuth Debug] /api/auth/me succeeded:', profile);
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));

      console.log('[OAuth Debug] Setting isAuthenticated=true (completeGoogleSignIn succeeded).');
      set({ user, token: tokens.accessToken, isAuthenticated: true, isGuest: false, isLoading: false });
      useSettingsStore.getState().fetchSettings();
      console.log('[OAuth Debug] authStore state after completeGoogleSignIn:', useAuthStore.getState());
      console.log('[OAuth Debug] completeGoogleSignIn end (success).');

      // Supplementary, not part of sign-in itself — a failure here (network hiccup, whatever)
      // just means the prompt doesn't show this time, not a failed sign-in. Fired after the
      // state above so the main app is already showing before this resolves.
      try {
        const alreadyPrompted = await storage.getItem(passwordPromptedKey(user.id));
        if (!alreadyPrompted && (await hasOnlyGoogleIdentity())) {
          set({ needsPasswordSetup: true });
        }
      } catch (err) {
        console.log('[OAuth Debug] password-setup check failed (non-fatal):', err);
      }
    } catch (err) {
      console.log('[OAuth Debug] completeGoogleSignIn FAILED:', err);
      // Not re-thrown — there's no caller left waiting on a promise by the time this runs
      // (it's invoked from an event listener, not from loginWithGoogle's own call stack).
      // OAuthCallbackScreen (app root) watches `error` directly to show this.
      set({ error: getApiErrorMessage(err), isLoading: false });
    }
  },

  setPassword: async (password) => {
    const user = get().user;
    await setSupabasePassword(password);
    if (user) await storage.setItem(passwordPromptedKey(user.id), 'true');
    set({ needsPasswordSetup: false });
  },

  skipPasswordSetup: async () => {
    const user = get().user;
    if (user) await storage.setItem(passwordPromptedKey(user.id), 'true');
    set({ needsPasswordSetup: false });
  },

  loginAsGuest: async () => {
    set({ isLoading: true, error: null });
    resetDomainStores();
    try {
      await wait(400);

      const user: User = {
        id: `guest_${Date.now()}`,
        name: 'Demo User',
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
    console.log('[OAuth Debug] authStore.logout() called — this will set isAuthenticated=false.', new Error().stack);
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
    await storage.removeItem(AUTH_REFRESH_KEY);
    if (wasGuest) {
      await guestStorage.clearGuestData();
    }
    resetDomainStores();

    set({ user: null, token: null, isAuthenticated: false, isGuest: false, needsPasswordSetup: false });
  },

  restoreSession: async () => {
    console.log('[OAuth Debug] restoreSession() called.', new Error().stack);
    const token = await storage.getItem(TOKEN_KEY);
    console.log('[OAuth Debug] restoreSession: found cached token?', Boolean(token));
    if (!token) {
      console.log('[OAuth Debug] restoreSession: no token, returning early (no state change).');
      return;
    }

    const rawUser = await storage.getItem(USER_KEY);
    let cachedUser: User | null = null;
    try {
      cachedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      cachedUser = null;
    }
    console.log('[OAuth Debug] restoreSession: cached user =', cachedUser);

    // Guests never touch the backend — the local cache is the only copy that exists.
    if (cachedUser?.isGuest) {
      console.log('[OAuth Debug] restoreSession: cached user is a guest, setting isAuthenticated=true and returning.');
      set({ user: cachedUser, token, isAuthenticated: true, isGuest: true });
      return;
    }

    // Show the cached profile immediately (instant on relaunch instead of a loading
    // screen), then verify the token and refresh the profile in the background.
    if (cachedUser) {
      console.log('[OAuth Debug] restoreSession: optimistically setting isAuthenticated=true from cached user (not yet verified).');
      set({ user: cachedUser, token, isAuthenticated: true, isGuest: false });
    }

    try {
      console.log('[OAuth Debug] restoreSession: verifying token via /api/auth/me...');
      const { profile } = await authService.me();
      console.log('[OAuth Debug] restoreSession: /api/auth/me succeeded, confirming isAuthenticated=true.');
      const user = mapProfileToUser(profile);
      await storage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isGuest: false });
    } catch (err) {
      console.log('[OAuth Debug] restoreSession: /api/auth/me FAILED:', err);
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
  console.log('[OAuth Debug] onUnauthorized fired — this will set isAuthenticated=false. Previous state:', useAuthStore.getState());
  resetDomainStores();
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isGuest: false, needsPasswordSetup: false });
  console.log('[OAuth Debug] isAuthenticated=false set by onUnauthorized.');
});

// See googleAuth.service.ts's onGoogleSignIn/onAuthStateChange comment — this is the one
// place that actually completes a Google sign-in, on both platforms.
onGoogleSignIn((tokens) => useAuthStore.getState().completeGoogleSignIn(tokens));

// Keeps our own copy of the Google session's access token current if supabase-js silently
// rotates it later — see onGoogleTokenRefresh's own comment for why this exists. Deliberately
// NOT resetDomainStores()/isAuthenticated/etc — this is a same-session token swap, not a
// sign-in event, so nothing else about the session has changed.
onGoogleTokenRefresh((accessToken) => {
  // Supabase's own background auto-refresh timer keeps running for the lifetime of the tab/
  // process regardless of what this app's authStore thinks — logout() never calls
  // supabase.auth.signOut() (see googleAuth.service.ts's comment on why not), so a refresh
  // firing after an explicit logout would otherwise silently write a fresh, valid token back
  // into app storage and re-authenticate the user on their next reload, despite having logged
  // out. Guarding on isAuthenticated (rather than touching the fragile signOut() path) is
  // enough to stop that without reintroducing whatever signOut() previously broke.
  if (!useAuthStore.getState().isAuthenticated) {
    console.log('[OAuth Debug] authStore: ignoring token refresh — not authenticated (logged out).');
    return;
  }
  console.log('[OAuth Debug] authStore: persisting refreshed token from Supabase.');
  storage.setItem(TOKEN_KEY, accessToken);
  useAuthStore.setState({ token: accessToken });
});

// api.ts refreshed an expired email/password session — adopt the new access token so the
// request interceptor (which reads this store first) uses it from now on.
onTokenRefreshed((accessToken) => {
  if (!useAuthStore.getState().isAuthenticated) return;
  useAuthStore.setState({ token: accessToken });
});

// api.ts's request interceptor reads the token from here first (in-memory, synchronous)
// instead of always awaiting a storage read — see registerTokenGetter's own comment.
registerTokenGetter(() => useAuthStore.getState().token);

// Keeps utils/authFlags.ts's isGuestMode()/hasAuthToken() in sync with this store's own
// isGuest/token — see that file's comment for why every other store reads them through it
// instead of importing authStore directly. Each fires once immediately on subscribe with
// the current value, then on every subsequent change.
setGuestMode(useAuthStore.getState().isGuest);
useAuthStore.subscribe((state) => setGuestMode(state.isGuest));

setHasAuthToken(Boolean(useAuthStore.getState().token));
useAuthStore.subscribe((state) => setHasAuthToken(Boolean(state.token)));

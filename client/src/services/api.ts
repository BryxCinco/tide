import axios, { AxiosError } from 'axios';

import { showToast } from '../store/toastStore';
import { storage } from '../utils/storage';

export const AUTH_TOKEN_KEY = 'tide_auth_token';
export const AUTH_USER_KEY = 'tide_auth_user';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

type TokenGetter = () => string | null;
let getInMemoryToken: TokenGetter = () => null;

/** authStore registers itself here at module load (`() => useAuthStore.getState().token`).
 * Reading the in-memory value first — falling back to the async storage read only when
 * nothing's registered yet — means the very first request fired the instant
 * isAuthenticated flips true (e.g. the dashboard's mount-time fetches, right after
 * completeGoogleSignIn's `set()`) sees the token synchronously, with no dependency on a
 * storage read landing in time. Kept as a listener instead of an import for the same reason
 * as onUnauthorized below: authStore already imports api.ts. */
export function registerTokenGetter(getter: TokenGetter): void {
  getInMemoryToken = getter;
}

api.interceptors.request.use(async (config) => {
  const token = getInMemoryToken() ?? (await storage.getItem(AUTH_TOKEN_KEY));
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

/** authStore registers itself here at module load. Kept as a listener instead of an
 * import so api.ts never imports authStore — authStore already imports api.ts, and a
 * two-way import between them would be a circular dependency. */
export function onUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // TEMPORARY — remove once the OAuth redirect-loop bug is confirmed fixed.
      console.log('[OAuth Debug] 401 response received:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        data: error.response.data,
      });
      await storage.removeItem(AUTH_TOKEN_KEY);
      await storage.removeItem(AUTH_USER_KEY);
      console.log('[OAuth Debug] Cleared storage. Calling onUnauthorized listener — this will set isAuthenticated=false.');
      unauthorizedListener?.();
    } else if (!error.response) {
      // No response at all means the request never reached the server (offline, DNS, server
      // down) — a 400/404/500 with a body is left for the calling store to handle inline,
      // same as every other expected failure (bad login, validation, etc).
      showToast('Network error — check your connection.', 'error');
    }
    return Promise.reject(error);
  },
);

/** Pulls the backend's own `{ error: "..." }` message out of a failed request. An
 * AxiosError's own `.message` is generic ("Request failed with status code 400"), not the
 * actual reason — every store's catch block should use this instead. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.message === 'Network Error') return 'Network error — check your connection.';
  }
  return err instanceof Error ? err.message : fallback;
}

/** Pulls the backend's own `{ code: "..." }` out of a failed request, when it sent one —
 * most error responses don't (getApiErrorMessage's plain `.error` string is enough for a
 * toast), but a few need the UI to branch on *why* it failed, not just display a message
 * (e.g. login.tsx's 'google_only' case). Undefined when there's no code, same as a plain
 * message-only error. */
export function getApiErrorCode(err: unknown): string | undefined {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { code?: string } | undefined;
    return data?.code;
  }
  return undefined;
}

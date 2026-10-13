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

// The only two endpoints that are ever legitimately called with no token yet.
const PUBLIC_AUTH_PATHS = ['/api/auth/login', '/api/auth/signup'];

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
}

/** Thrown by the request interceptor below instead of ever sending a request with no
 * Authorization header (except to the two public auth endpoints). Recognizable by both the
 * response interceptor and `getApiErrorMessage` so this never surfaces as a real error toast —
 * it's a timing issue (a fetch raced ahead of login completing, or fired mid-logout after
 * storage was already cleared), not an auth failure the user did anything wrong to cause. */
export class SkippedRequestError extends Error {
  constructor(url?: string) {
    super(`Request skipped — no auth token yet${url ? ` (${url})` : ''}`);
    this.name = 'SkippedRequestError';
  }
}

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
    return config;
  }

  if (isPublicAuthRequest(config.url)) {
    return config;
  }

  // No token yet, and this isn't a public auth endpoint — the caller raced ahead of login
  // completing, or fired after logout already cleared storage but before the app finished
  // navigating away. Skip the round trip entirely instead of letting it 401 with "Missing
  // Authorization Bearer token", a message that has nothing to do with the token being
  // invalid and shouldn't be shown to the user as if it were.
  console.log(`[api] Skipping request — no auth token yet: ${config.method?.toUpperCase()} ${config.url}`);
  return Promise.reject(new SkippedRequestError(config.url));
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
  async (error: AxiosError | SkippedRequestError) => {
    if (error instanceof SkippedRequestError) {
      // Already logged by the request interceptor — never a real failure, nothing else to do.
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      const serverMessage = (error.response.data as { error?: string } | undefined)?.error;

      if (serverMessage === 'Missing Authorization Bearer token') {
        // The request interceptor's own guard above should make this unreachable in
        // practice, but defend against it anyway: this means a request somehow still went
        // out with no Authorization header, which is a timing issue (same as
        // SkippedRequestError), not proof the token is invalid. Logging the user out over a
        // race would be wrong — just log it and move on.
        console.log('[api] Server saw a request with no auth token (timing, not invalid):', error.config?.url);
        return Promise.reject(error);
      }

      // A real "Invalid or expired token" — the session itself is no good, so clear it and
      // sign the user out.
      await storage.removeItem(AUTH_TOKEN_KEY);
      await storage.removeItem(AUTH_USER_KEY);
      unauthorizedListener?.();
    } else if (!error.response && error.code !== 'ECONNABORTED') {
      // No response at all means the request never reached the server (offline, DNS, server
      // down) — a 400/404/500 with a body is left for the calling store to handle inline,
      // same as every other expected failure (bad login, validation, etc). A timeout
      // (ECONNABORTED) also has no `.response`, but it isn't a connectivity problem — the
      // request DID go out, the server just didn't answer in time — so it's excluded here
      // and left to the calling code's own getApiErrorMessage(), which gives it its own
      // accurate message instead of this misleading "check your connection".
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
    // A timed-out request has no `.response` and axios's own `.message` is the raw
    // "timeout of 15000ms exceeded" string — without this check that number leaks straight
    // into a user-facing toast instead of a message that actually means something to them.
    if (err.code === 'ECONNABORTED') return "That's taking longer than expected. Please try again.";
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

/** `showToast(getApiErrorMessage(err), 'error')`, but silent for a SkippedRequestError — the
 * one error every catch block across the app's stores/components should route a failed
 * request's error through instead of calling showToast directly, so "the request never even
 * went out because there was no token yet" can never itself surface as a user-facing error
 * toast (it very nearly did: the request interceptor correctly stopped the request, but the
 * calling code's own unconditional `showToast(getApiErrorMessage(err))` still fired on the
 * rejection either way). */
export function reportApiError(err: unknown, fallback?: string): void {
  if (err instanceof SkippedRequestError) {
    console.log('[api] Swallowed a SkippedRequestError instead of toasting it:', err.message);
    return;
  }
  showToast(getApiErrorMessage(err, fallback), 'error');
}

import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';

export interface GoogleSessionTokens {
  accessToken: string;
  refreshToken: string | null;
}

type GoogleSignInHandler = (tokens: GoogleSessionTokens) => Promise<void>;
type GoogleTokenRefreshHandler = (accessToken: string) => void;

let handleGoogleSignIn: GoogleSignInHandler = async () => {};
let handleGoogleTokenRefresh: GoogleTokenRefreshHandler = () => {};

/**
 * authStore registers itself here (mirrors api.ts's `onUnauthorized` listener pattern) so
 * this file never has to import authStore back — authStore already imports
 * `signInWithGoogle` from here, and a two-way import would be circular.
 */
export function onGoogleSignIn(handler: GoogleSignInHandler): void {
  handleGoogleSignIn = handler;
}

/**
 * Fires whenever supabase-js silently rotates the access token of an already-established
 * Google session (its own internal autoRefreshToken timer — nothing this app's code
 * triggers directly). authStore keeps its own separate copy of that access token (in its
 * `token` field + AUTH_TOKEN_KEY storage, same as the email/password path) because the
 * backend is authenticated with a plain Bearer token, not with this `supabase` client
 * instance. Without this, that copy is only ever written once, at sign-in — if supabase-js
 * rotates the underlying token afterward, our copy silently goes stale and every request
 * after the rotation 401s with a token that "looks" fine (same session, just outdated).
 */
export function onGoogleTokenRefresh(handler: GoogleTokenRefreshHandler): void {
  handleGoogleTokenRefresh = handler;
}

/**
 * Only ever used for TOKEN_REFRESHED now — sign-in completion does NOT go through this
 * listener (see signInWithGoogle's own comment for why). This client runs with
 * `persistSession: true` (required for the PKCE code_verifier to survive the redirect out to
 * Google and back — see lib/supabase.ts), and supabase-js automatically opens a
 * `BroadcastChannel` to sync auth events across every tab/window on this same site whenever
 * that's on. That's exactly the trap a SIGNED_IN listener falls into: a leftover tab from an
 * earlier session refreshing or re-emitting ITS OWN (unrelated, possibly stale) session
 * broadcasts a SIGNED_IN/TOKEN_REFRESHED that this tab's listener cannot tell apart from its
 * own real sign-in completing. That's the actual mechanism behind `onAuthStateChange` firing
 * SIGNED_IN more than once for a single redirect (confirmed via a real console trace) — not
 * a bug in the exchange itself, but a cross-tab broadcast landing in the middle of it. Rather
 * than try to filter broadcast-originated events out (the public API gives no way to), both
 * signInWithGoogle's web and native branches now call handleGoogleSignIn directly from their
 * own `exchangeCodeForSession()` result, which cannot be confused with any other tab's
 * traffic. TOKEN_REFRESHED is left listened-to here because a same-tab, same-session refresh
 * is exactly what it's meant to reflect, and authStore's copy of the token does need to stay
 * in sync with it regardless of which tab's timer fired it.
 */
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[OAuth Debug] onAuthStateChange fired:', {
    event,
    hasSession: Boolean(session),
    accessTokenPrefix: session?.access_token ? `${session.access_token.slice(0, 12)}...` : null,
    hasRefreshToken: Boolean(session?.refresh_token),
  });

  if (event === 'TOKEN_REFRESHED' && session) {
    console.log('[OAuth Debug] Supabase rotated the access token — syncing authStore\'s copy.');
    handleGoogleTokenRefresh(session.access_token);
  }
  // Deliberately NOT calling supabase.auth.signOut() here — an earlier version of this
  // file did, on the theory that it was harmless "local" cleanup of this client's own
  // session copy. It is not harmless: reading _signOut()'s actual implementation
  // (@supabase/auth-js's GoTrueClient), EVERY scope — including 'local' — calls
  // `this.admin.signOut(accessToken, scope)`, a real network call that revokes that
  // access token server-side. 'local' only controls *which* sessions get revoked (this
  // device vs. every device), not whether a revocation happens at all. That call was
  // immediately invalidating the very token just handed to authStore, which is exactly
  // why sign-in appeared to succeed for a moment and then fail with "Invalid or expired
  // token" shortly after. Leaving supabase-js's own session in place costs nothing but a
  // second, unused copy of the session sitting in storage under its own distinct key.
});

/**
 * Web's half of the OAuth redirect: exchanges `?code=...` for a session exactly once,
 * manually, and completes sign-in directly from the result — see the onAuthStateChange
 * comment above for why this can no longer go through that listener (cross-tab
 * BroadcastChannel traffic). `lib/supabase.ts` runs with `detectSessionInUrl: false` now:
 * its automatic version of this exact exchange was firing the underlying exchange request
 * itself TWICE for one redirect, and Supabase treats a second exchange of the same
 * authorization code as a replay attack, responding by revoking the session the first
 * (legitimate) exchange had just issued — which is why sign-in used to appear to succeed
 * and then fail moments later. Runs once at module load — the only point in time this page
 * load will ever see this particular `?code=`.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    console.log('[OAuth Debug] (web) manual exchangeCodeForSession starting for code:', `${code.slice(0, 12)}...`);
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      console.log(
        '[OAuth Debug] (web) manual exchangeCodeForSession result:',
        error ? `error: ${error.message}` : 'success',
      );
      if (error || !data.session) return; // Left for OAuthCallbackScreen's own 10s timeout to surface.
      handleGoogleSignIn({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token ?? null,
      });
    });
  }
}

/**
 * Starts Google sign-in via Supabase + PKCE. Returns `true` if a flow that will eventually
 * produce a sign-in was actually started, `false` if the user cancelled before it could
 * (native only — see below). Never returns the session itself on web (the tab navigates
 * away before there's anything to return); on native, completion happens inline in this
 * same function via `handleGoogleSignIn`, straight from `exchangeCodeForSession`'s own
 * result — same reasoning as the module-scope web block above (see onAuthStateChange's
 * comment): going through the shared listener risked picking up another tab/session's
 * broadcast instead of this attempt's own result.
 *
 * Web and native need genuinely different mechanisms here, not just different `redirectTo`
 * values:
 *  - **Web**: a full top-level redirect (`window.location.assign`, done by supabase-js
 *    itself since `skipBrowserRedirect` is omitted). The tab navigates away entirely and
 *    this function's remaining code never runs — completion happens on the next page load,
 *    via the module-scope block above. This deliberately replaces an earlier popup-based
 *    attempt (`WebBrowser.openAuthSessionAsync` + `postMessage` back to the opener): that
 *    mechanism depends on the popup retaining a `window.opener` reference and a `message`
 *    event actually arriving, both of which browsers' Cross-Origin-Opener-Policy defaults
 *    can silently break — which is exactly what produced a popup landing on `?code=...`
 *    with nothing ever telling the main tab about it. A full redirect has no popup, no
 *    postMessage, and nothing for COOP to break.
 *  - **Native**: there's no page to navigate away from, so this opens a system browser
 *    session and waits for it — `openAuthSessionAsync` on native uses
 *    ASWebAuthenticationSession/Custom Tabs, which intercept the `tide://` redirect
 *    directly via the OS, not via a popup or postMessage. That mechanism isn't what broke,
 *    so it's unchanged.
 */
export async function signInWithGoogle(): Promise<boolean> {
  const redirectTo = makeRedirectUri({ scheme: 'tide' });
  console.log('[OAuth Debug] signInWithGoogle starting. redirectTo =', redirectTo, 'platform =', Platform.OS);

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      console.log('[OAuth Debug] signInWithOAuth (web) returned an error:', error.message);
      throw new Error(error.message);
    }
    console.log('[OAuth Debug] signInWithOAuth (web) succeeded — tab should be navigating to Google now.');
    return true;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    throw new Error(error?.message ?? 'Could not start Google sign-in.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return false;
  }
  if (result.type !== 'success' || !result.url) {
    throw new Error("Google sign-in didn't complete. Please try again.");
  }

  const { params, errorCode } = QueryParams.getQueryParams(result.url);
  if (errorCode) {
    throw new Error(errorCode);
  }
  if (params.error_description) {
    throw new Error(params.error_description);
  }
  if (!params.code) {
    throw new Error('No authorization code returned from Google.');
  }

  console.log('[OAuth Debug] (native) code received:', `${params.code.slice(0, 12)}...`);
  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
  console.log('[OAuth Debug] (native) exchangeCodeForSession result:', exchangeError ? `error: ${exchangeError.message}` : 'success');
  if (exchangeError) {
    throw new Error(exchangeError.message);
  }
  if (!exchangeData.session) {
    throw new Error('No session returned from Google sign-in.');
  }

  await handleGoogleSignIn({
    accessToken: exchangeData.session.access_token,
    refreshToken: exchangeData.session.refresh_token ?? null,
  });
  return true;
}

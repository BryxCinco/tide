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

let handleGoogleSignIn: GoogleSignInHandler = async () => {};

/**
 * authStore registers itself here (mirrors api.ts's `onUnauthorized` listener pattern) so
 * this file never has to import authStore back — authStore already imports
 * `signInWithGoogle` from here, and a two-way import would be circular.
 */
export function onGoogleSignIn(handler: GoogleSignInHandler): void {
  handleGoogleSignIn = handler;
}

/**
 * Fires whenever *this* client's session changes, which happens two different ways
 * depending on platform:
 *  - Native: `exchangeCodeForSession()` below triggers it directly, in the same tick as
 *    `signInWithGoogle()`'s own await.
 *  - Web: `lib/supabase.ts`'s `detectSessionInUrl: true` triggers it automatically on a
 *    fresh page load, the moment Supabase has just redirected back here with `?code=...`
 *    in the URL — a completely different JS context than the one that started the flow,
 *    which is exactly why this has to be an event listener rather than something
 *    `signInWithGoogle()` can just return a value from on web.
 *
 * Registered at module scope (not inside a React effect) so it's subscribed before
 * supabase-js's own internal initialization — which is what runs detectSessionInUrl's
 * auto-exchange — has a chance to complete and be missed.
 */
supabase.auth.onAuthStateChange((event, session) => {
  // TEMPORARY — remove once the redirect-loop bug is confirmed fixed.
  console.log('[OAuth Debug] onAuthStateChange fired:', {
    event,
    hasSession: Boolean(session),
    accessTokenPrefix: session?.access_token ? `${session.access_token.slice(0, 12)}...` : null,
    hasRefreshToken: Boolean(session?.refresh_token),
  });

  if (event !== 'SIGNED_IN' || !session) return;

  handleGoogleSignIn({
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? null,
  });
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
 * Starts Google sign-in via Supabase + PKCE. Returns `true` if a flow that will eventually
 * produce a sign-in was actually started, `false` if the user cancelled before it could
 * (native only — see below). Never returns the session itself; completion always goes
 * through the `onGoogleSignIn` listener above, uniformly for both platforms.
 *
 * Web and native need genuinely different mechanisms here, not just different `redirectTo`
 * values:
 *  - **Web**: a full top-level redirect (`window.location.assign`, done by supabase-js
 *    itself since `skipBrowserRedirect` is omitted). The tab navigates away entirely and
 *    this function's remaining code never runs — completion happens on the next page load,
 *    via detectSessionInUrl (see lib/supabase.ts) and the listener above. This deliberately
 *    replaces an earlier popup-based attempt (`WebBrowser.openAuthSessionAsync` +
 *    `postMessage` back to the opener): that mechanism depends on the popup retaining a
 *    `window.opener` reference and a `message` event actually arriving, both of which
 *    browsers' Cross-Origin-Opener-Policy defaults can silently break — which is exactly
 *    what produced a popup landing on `?code=...` with nothing ever telling the main tab
 *    about it. A full redirect has no popup, no postMessage, and nothing for COOP to break.
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
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
  console.log('[OAuth Debug] (native) exchangeCodeForSession result:', exchangeError ? `error: ${exchangeError.message}` : 'success');
  if (exchangeError) {
    throw new Error(exchangeError.message);
  }

  // No need to read the returned session here — exchangeCodeForSession's own internal
  // _saveSession() firing the SIGNED_IN event above is what completes the sign-in, keeping
  // native and web funneled through the exact same completion path.
  return true;
}

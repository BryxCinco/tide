import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../lib/supabase';

// Required by expo-web-browser on web: lets a popup opened by openAuthSessionAsync signal
// completion back to the tab that opened it (window.opener.postMessage). No-op on native.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleSessionTokens {
  accessToken: string;
  refreshToken: string | null;
}

/**
 * Google sign-in via Supabase's OAuth + PKCE, driven entirely client-side through
 * expo-auth-session/expo-web-browser rather than a webview the app has to manage by hand:
 *
 * 1. Ask Supabase for the Google consent-screen URL (`skipBrowserRedirect: true` so
 *    supabase-js hands back the URL instead of navigating the page itself — needed so the
 *    same code path works on native, where there's no "current page" to navigate).
 * 2. Open it in the system browser via `openAuthSessionAsync`, which transparently captures
 *    the redirect back to `redirectTo` (our own `tide://` scheme on native, matching what
 *    was registered as a Redirect URL in both the Supabase and Google Cloud consoles; the
 *    app's actual origin on web) and resolves with that URL once Google/Supabase redirect
 *    there — this *is* the deep-link handoff, no separate `Linking` listener needed.
 * 3. Pull the PKCE `code` out of that redirect URL and exchange it for a real Supabase
 *    session.
 *
 * Returns `null` (not a throw) if the user closes the browser/cancels — that's an expected,
 * silent outcome, not a failure worth surfacing as an error toast; the caller (authStore)
 * decides what "no result" means for its loading state.
 */
export async function signInWithGoogle(): Promise<GoogleSessionTokens | null> {
  const redirectTo = makeRedirectUri({ scheme: 'tide' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error || !data?.url) {
    throw new Error(error?.message ?? 'Could not start Google sign-in.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return null;
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

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
  if (exchangeError || !sessionData.session) {
    throw new Error(exchangeError?.message ?? 'Could not complete Google sign-in.');
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token ?? null,
  };
}

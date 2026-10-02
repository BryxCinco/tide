import { createClient } from '@supabase/supabase-js';

import { storage } from '../utils/storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — check client/.env.',
  );
}

/**
 * Client-side Supabase instance, used ONLY for flows that need supabase-js's own local PKCE
 * state: the Google OAuth handshake (see services/googleAuth.service.ts) and the
 * forgot/reset-password recovery handshake (see services/passwordReset.service.ts) — both
 * generate a code_verifier that has to live in THIS device/browser's storage for the later
 * exchangeCodeForSession() to find. Every other auth/data operation in this app goes through
 * the Express backend instead, which holds the service-role key; this client only ever
 * carries the public anon key.
 *
 * `detectSessionInUrl: false` is deliberate, not the default-off you'd expect for a plain
 * client — it used to be `true`, which is supabase-js's normal way of handling this exact
 * redirect (Google signs the user in, Supabase redirects the *same tab* back here with
 * `?code=...`, a full page reload). That auto-exchange is exactly what broke sign-in:
 * confirmed via a real console trace, it fired `onAuthStateChange('SIGNED_IN', ...)` TWICE
 * for one redirect. Reusing a PKCE authorization code is treated by OAuth providers as a
 * replay attack, and Supabase's response to that is to revoke the session the code
 * produced — including the FIRST, legitimate one. That's why sign-in appeared to succeed
 * (the dashboard even loaded) and then every request started 401ing moments later: Supabase
 * had revoked the token server-side in response to the second exchange attempt. Exactly why
 * a single client fires that auto-exchange twice wasn't fully root-caused, so instead
 * googleAuth.service.ts now does the exchange itself, manually, exactly once — the same
 * `exchangeCodeForSession` call the native branch of signInWithGoogle already used, just
 * extended to web instead of relying on this automatic (and here, duplicating) mechanism.
 *
 * `persistSession`/`autoRefreshToken` stay on — the manual exchange above still needs a
 * live, refreshable session to complete and to keep authStore's copy of the token in sync
 * afterward (see googleAuth.service.ts's onGoogleTokenRefresh) — but authStore, not this
 * client, stays the one thing the rest of the app reads auth state from.
 *
 * `storage` reuses the same cross-platform SecureStore/localStorage wrapper authStore's
 * real session is persisted under (see utils/storage.ts) — supabase-js uses it both for
 * the PKCE code_verifier (during the round trip out to Google and back) and, briefly, for
 * its own session before this client hands it off and clears it.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

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
 * Client-side Supabase instance, used ONLY for the Google OAuth handshake (see
 * services/googleAuth.service.ts). Every other auth/data operation in this app goes
 * through the Express backend instead, which holds the service-role key; this client only
 * ever carries the public anon key.
 *
 * `detectSessionInUrl: true` is what makes web OAuth actually work: on web, Google signs
 * the user in and Supabase redirects the *same tab* back to this app with `?code=...` in
 * the URL — a full page reload, not a callback our own JS is still running to catch. This
 * setting makes supabase-js notice that query param itself on the next load, exchange it
 * for a session automatically, and fire `onAuthStateChange('SIGNED_IN', session)` — see
 * googleAuth.service.ts's module-scope listener, which is what authStore actually reacts
 * to. Without it, that `?code=` just sits in the URL with nothing reading it, which is
 * exactly what produced the blank, stuck page.
 *
 * `persistSession`/`autoRefreshToken` are on because the above literally doesn't work
 * without them (detectSessionInUrl's auto-exchange is wired into the same session
 * lifecycle they gate) — but authStore, not this client, stays the one thing the rest of
 * the app reads auth state from: the moment its listener sees a session, it hands the
 * tokens off and this client's own local copy is signed out (see googleAuth.service.ts),
 * so nothing is left here to drift out of sync with it.
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
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

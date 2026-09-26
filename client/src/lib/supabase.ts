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
 * Client-side Supabase instance, used ONLY for the Google OAuth handshake
 * (signInWithOAuth + exchangeCodeForSession — see services/googleAuth.service.ts). Every
 * other auth/data operation in this app goes through the Express backend instead (see
 * services/*.service.ts), which holds the service-role key; this client only ever carries
 * the public anon key.
 *
 * `storage` reuses the same cross-platform SecureStore/localStorage wrapper authStore
 * already persists the real session under (see utils/storage.ts) — supabase-js uses it to
 * stash the PKCE code_verifier for the round trip out to the system browser and back.
 * `persistSession`/`autoRefreshToken` are off and `detectSessionInUrl` is off: once
 * exchangeCodeForSession() resolves, googleAuth.service.ts hands the resulting
 * access_token/refresh_token straight to authStore, which is this app's one real source of
 * truth for the session — letting supabase-js *also* auto-persist/refresh its own separate
 * copy would give the app two session stores that can silently drift out of sync.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

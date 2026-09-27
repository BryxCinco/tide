const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin = null;
let supabaseAuth = null;
let initError = null;

try {
  if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is not set');
  if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is not set');
  if (!process.env.SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY is not set');

  // Service-role client: full DB access, bypasses RLS. Used for all table reads/writes —
  // routes filter by req.user.id manually since RLS isn't enforced under this key.
  supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Anon-key client: used only for auth.* calls (signUp/signInWithPassword), matching how
  // the client app would talk to Supabase Auth directly.
  supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
} catch (err) {
  // Deliberately swallowed, not re-thrown. This module is required at the top level by
  // app.js — on Vercel, an exception during module load crashes the *entire* function
  // before Express ever starts handling requests, which is exactly why a missing/bad env
  // var shows up as an opaque 500 FUNCTION_INVOCATION_FAILED with no detail anywhere.
  // Every consumer of these clients (requireAuth below, and app.js's /api/health and
  // /api/debug) checks `initError`/null first instead, so the app can still boot and
  // actually report what's wrong rather than dying silently at startup.
  initError = err;
  console.error('[supabaseClient] Initialization failed:', err.message);
}

module.exports = { supabaseAdmin, supabaseAuth, initError };

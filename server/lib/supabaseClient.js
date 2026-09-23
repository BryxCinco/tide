const { createClient } = require('@supabase/supabase-js');

// Service-role client: full DB access, bypasses RLS. Used for all table reads/writes —
// routes filter by req.user.id manually since RLS isn't enforced under this key.
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon-key client: used only for auth.* calls (signUp/signInWithPassword), matching how
// the client app would talk to Supabase Auth directly.
const supabaseAuth = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabaseAdmin, supabaseAuth };

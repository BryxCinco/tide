const express = require('express');
const { supabaseAuth, supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { deleteAllUserFiles } = require('../lib/storage');

const router = express.Router();

// Every table that holds per-user rows, keyed by user_id — kept as one list so account
// deletion (below) can't silently miss one if a table gets added later without remembering
// to update this. `profiles` isn't here — it's keyed by `id`, not `user_id`, and is deleted
// separately after these.
const USER_SCOPED_TABLES = [
  'tasks',
  'journal_entries',
  'time_logs',
  'activities',
  'quests',
  'streaks',
  'user_settings',
  // Added post-Phase 11.2 — embeddings.user_id references auth.users, so leaving old rows
  // behind here was blocking supabaseAdmin.auth.admin.deleteUser() with a foreign-key
  // "Database error deleting user" (found via a throwaway test-account delete during 11.5).
  'embeddings',
];

// POST /api/auth/signup — creates the auth.users row; the DB trigger (handle_new_user)
// auto-creates matching profiles/user_settings/streaks rows from raw_user_meta_data.name.
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    session: data.session,
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({
    user: { id: data.user.id, email: data.user.email },
    session: data.session,
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization.slice(7);
  const { error } = await supabaseAdmin.auth.admin.signOut(token, 'global');

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', req.user.id).single();

  if (!error) {
    return res.json({ profile: data });
  }

  // PGRST116 = PostgREST's "expected exactly one row, got zero (or more than one)" —
  // here that means handle_new_user() never created a profiles row for this account.
  // Known cause: the trigger originally only read raw_user_meta_data->>'name', which
  // email/password signups have (see auth.js's own signup route) but Google OAuth users
  // don't — Supabase populates their metadata as `full_name` instead, so the INSERT got a
  // null name and either failed outright or (depending on the profiles.name constraint)
  // silently produced no row. Self-heal here instead of leaving the user stuck on every
  // future login: fetch the real auth.users record for the metadata the JWT alone doesn't
  // carry, and create the missing rows lazily. See migrations/003_google_oauth_profile_trigger.sql
  // for the actual trigger fix — this is a safety net for accounts that hit the bug before
  // that migration is run, not a replacement for it.
  if (error.code !== 'PGRST116') {
    return res.status(404).json({ error: error.message });
  }

  const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
  if (authUserError || !authUserData?.user) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const meta = authUserData.user.user_metadata || {};
  const name = meta.name || meta.full_name || (req.user.email ? req.user.email.split('@')[0] : 'User');
  const avatarUrl = meta.avatar_url || meta.picture || null;

  const { data: created, error: createError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: req.user.id, name, email: req.user.email, avatar_url: avatarUrl })
    .select()
    .single();

  if (createError) {
    return res.status(500).json({ error: createError.message });
  }

  // Best-effort — these might already exist if the trigger partially ran before failing;
  // 23505 is Postgres' unique-violation code for that case, safe to ignore. The profile
  // itself, which is what /me actually needs, already succeeded above regardless.
  const { error: settingsError } = await supabaseAdmin.from('user_settings').insert({ user_id: req.user.id });
  if (settingsError && settingsError.code !== '23505') {
    console.error('[auth/me] user_settings backfill failed:', settingsError.message);
  }
  const { error: streaksError } = await supabaseAdmin.from('streaks').insert({ user_id: req.user.id });
  if (streaksError && streaksError.code !== '23505') {
    console.error('[auth/me] streaks backfill failed:', streaksError.message);
  }

  res.json({ profile: created });
});

// POST /api/auth/backfill-embeddings
// One-time endpoint to embed existing user data
router.post('/backfill-embeddings', requireAuth, async (req, res) => {
  try {
    const { backfillUserEmbeddings } = require('../lib/embeddingPipeline');
    const results = await backfillUserEmbeddings(req.user.id);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[backfill] failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/account — irreversibly deletes the current user: every per-user row
// across all tables, their uploaded files, the profiles row, and finally the Supabase Auth
// user itself. Guests never reach this (they have no backend account/token to send — see
// client/src/utils/deleteAccount.ts, which only calls this for real accounts).
//
// Order matters: dependent data first, profiles second, the auth user LAST. If anything
// fails partway, the worst case is orphaned-but-harmless rows under a still-existing
// account (recoverable — nothing was told it's "gone" yet) rather than a user who can no
// longer log in to see that their data didn't actually finish clearing.
router.delete('/account', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    await deleteAllUserFiles(userId);

    for (const table of USER_SCOPED_TABLES) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
      if (error) return res.status(500).json({ error: `Failed to delete ${table}: ${error.message}` });
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profileError) return res.status(500).json({ error: `Failed to delete profile: ${profileError.message}` });

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error(`[auth] deleteUser failed for ${userId}:`, authDeleteError.message);
      return res.status(500).json({ error: authDeleteError.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not delete account.' });
  }
});

module.exports = router;

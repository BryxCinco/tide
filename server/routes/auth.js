const express = require('express');
const { supabaseAuth, supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

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

  if (error) {
    return res.status(404).json({ error: error.message });
  }

  res.json({ profile: data });
});

module.exports = router;

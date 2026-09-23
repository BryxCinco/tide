const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.patch('/', async (req, res) => {
  const { name, bio, avatar_url, cover_url, cover_type, cover_value } = req.body;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ name, bio, avatar_url, cover_url, cover_type, cover_value, updated_at: new Date().toISOString() })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ profile: data });
});

module.exports = router;

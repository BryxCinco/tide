const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('user_levels').select('total_xp, level').eq('user_id', req.user.id).single();

  // PGRST116 = no row yet (e.g. an account that predates this feature) — default to level 1
  // rather than erroring, same as xpService.js's awardXp.
  if (error && error.code !== 'PGRST116') return res.status(500).json({ error: error.message });

  res.json({ level: data || { total_xp: 0, level: 1 } });
});

module.exports = router;

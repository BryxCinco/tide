const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('streaks').select('*').eq('user_id', req.user.id).single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ streak: data });
});

module.exports = router;

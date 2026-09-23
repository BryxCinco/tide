const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('user_settings').select('*').eq('user_id', req.user.id).single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ settings: data });
});

router.patch('/', async (req, res) => {
  const { theme, notifications, sound_effects, typing_sounds, language, week_starts_on, time_format, dashboard_widgets } = req.body;

  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .update({
      theme,
      notifications,
      sound_effects,
      typing_sounds,
      language,
      week_starts_on,
      time_format,
      dashboard_widgets,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ settings: data });
});

module.exports = router;

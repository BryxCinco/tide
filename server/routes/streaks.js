const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { currentDailyStreak, requestTimezone } = require('../lib/dailyStreak');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin.from('streaks').select('*').eq('user_id', req.user.id).single();

  if (error) return res.status(500).json({ error: error.message });

  // Task streak reads as broken (0) the moment a day is skipped, rather than freezing at
  // its last value until the next task completion lazily resets it in the row itself —
  // computed here at read time instead of needing a daily cron job to zero it out
  // proactively (this project has none). The quest streak's own current_streak keeps its
  // existing lazy-reset-on-next-completion behavior, unchanged — its XP milestone bonuses
  // already depend on that exact semantics, and this task-streak feature is deliberately
  // additive, not a replacement.
  const streak = { ...data, task_current_streak: currentDailyStreak(data, requestTimezone(req)) };

  res.json({ streak });
});

module.exports = router;

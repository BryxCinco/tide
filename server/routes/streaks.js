const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

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
  const streak = { ...data };
  if (streak.task_last_completed_date && daysBetween(streak.task_last_completed_date, todayKey()) > 1) {
    streak.task_current_streak = 0;
  }

  res.json({ streak });
});

module.exports = router;

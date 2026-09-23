const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Day-count diff between two "YYYY-MM-DD" keys, computed via Date.UTC so it's immune to
// local-timezone rollover (same reasoning as the client's toDateKey/fromDateKey helpers).
function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / msPerDay);
}

// Advances the user's streak once a full day's quests are completed. No-ops if that date
// was already counted (idempotent — safe to call from every quest completion).
async function bumpStreakIfDayComplete(userId, dateKey) {
  const { data: dayQuests, error: questsError } = await supabaseAdmin
    .from('quests')
    .select('is_completed')
    .eq('user_id', userId)
    .eq('date', dateKey);

  if (questsError || !dayQuests?.length || dayQuests.some((q) => !q.is_completed)) return null;

  const { data: streak, error: streakError } = await supabaseAdmin
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (streakError || !streak) return null;
  if (streak.last_activity_date === dateKey) return streak;

  const gap = streak.last_activity_date ? daysBetween(streak.last_activity_date, dateKey) : null;
  const nextCurrent = gap === 1 ? streak.current_streak + 1 : 1;
  const nextLongest = Math.max(streak.longest_streak, nextCurrent);

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('streaks')
    .update({ current_streak: nextCurrent, longest_streak: nextLongest, last_activity_date: dateKey, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) return null;
  return updated;
}

// GET /api/quests?date=YYYY-MM-DD — defaults to today.
router.get('/', async (req, res) => {
  const date = req.query.date || todayKey();

  const { data, error } = await supabaseAdmin
    .from('quests')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ quests: data });
});

// POST /api/quests — used by the daily-quest generator to seed today's quest set.
router.post('/', async (req, res) => {
  const { title, description, icon, category, xp, date } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error } = await supabaseAdmin
    .from('quests')
    .insert({ user_id: req.user.id, title, description, icon, category, xp, date: date || todayKey() })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ quest: data });
});

router.patch('/:id', async (req, res) => {
  const isCompleted = Boolean(req.body.is_completed);

  const { data: quest, error } = await supabaseAdmin
    .from('quests')
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!quest) return res.status(404).json({ error: 'Quest not found' });

  const streak = isCompleted ? await bumpStreakIfDayComplete(req.user.id, quest.date) : null;

  res.json({ quest, streak });
});

module.exports = router;

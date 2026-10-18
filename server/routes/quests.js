const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { awardXp } = require('../lib/xpService');
const { bumpDailyStreak, requestTimezone } = require('../lib/dailyStreak');
const { computeQuestXp, applyCompletionBonus } = require('../lib/questXp');
const { generateDailyQuestsForUser, getQuestStreakInfo } = require('../lib/questGenerator');

const router = express.Router();
router.use(requireAuth);

// Streak lengths that earn a one-time bonus on top of the day's own quest XP.
const STREAK_MILESTONES = [7, 30, 100];

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
    .eq('date', dateKey)
    .eq('is_active', true);

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

  if (STREAK_MILESTONES.includes(nextCurrent)) {
    await awardXp(userId, 100, `${nextCurrent}-day streak bonus`).catch((err) =>
      console.error('[quests] streak bonus XP award failed:', err.message),
    );
  }

  return updated;
}

// GET /api/quests/streak — current/longest quest streak + a weekly completion rate.
// Registered before the /:id-shaped routes below so "streak" is never matched as an id.
router.get('/streak', async (req, res) => {
  try {
    res.json(await getQuestStreakInfo(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quests/generate — the "Generate Today's Quests" button. Same underlying
// generator the generateDailyQuests AI tool uses (server/lib/questGenerator.js) — "auto or
// manual" per the spec, one function either way. Replaces whatever non-custom quests already
// exist for today (custom ones the user added themselves are left alone) rather than piling
// up a second batch alongside them.
router.post('/generate', async (req, res) => {
  const date = req.body.date || todayKey();
  try {
    // generateDailyQuestsForUser inserts the new batch before clearing out the old one — see
    // its doc comment in questGenerator.js — so there's no separate clear-first step here.
    const quests = await generateDailyQuestsForUser(req.user.id, date);
    res.status(201).json({ quests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// POST /api/quests — used both by the daily-quest generator (is_custom: false) to seed
// today's random set, and by the user's own "+ Add Quest" flow (is_custom: true).
router.post('/', async (req, res) => {
  const {
    title,
    description,
    icon,
    category,
    tier,
    difficulty,
    xp,
    date,
    is_recurring: isRecurring,
    recurrence_type: recurrenceType,
    is_active: isActive,
    is_custom: isCustom,
    is_agentic: isAgentic,
    generation_reason: generationReason,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  // xp is auto-computed from tier+difficulty (the spec's whole point — no more hand-typed
  // XP numbers) unless an explicit value is passed, kept only for the daily-generator's own
  // insert path which already computes and sends its own final xp per pick.
  const resolvedTier = tier || 1;
  const resolvedXp = xp !== undefined ? xp : computeQuestXp(resolvedTier, difficulty ?? 1.0, 0, false);

  const { data, error } = await supabaseAdmin
    .from('quests')
    .insert({
      user_id: req.user.id,
      title,
      description,
      icon,
      category,
      tier: resolvedTier,
      xp: resolvedXp,
      date: date || todayKey(),
      is_recurring: Boolean(isRecurring),
      recurrence_type: isRecurring ? recurrenceType : null,
      is_active: isActive === undefined ? true : Boolean(isActive),
      is_custom: Boolean(isCustom),
      is_agentic: Boolean(isAgentic),
      generation_reason: generationReason ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ quest: data });
});

// PATCH /api/quests/:id — handles both a completion toggle (is_completed) and a full edit
// (title/description/icon/category/xp/recurring/active), since both are just partial
// updates to the same row. Only fields actually present in the body are touched.
router.patch('/:id', async (req, res) => {
  const update = {};
  let togglingCompletion = false;

  if ('title' in req.body) update.title = req.body.title;
  if ('description' in req.body) update.description = req.body.description;
  if ('icon' in req.body) update.icon = req.body.icon;
  if ('category' in req.body) update.category = req.body.category;
  if ('tier' in req.body) update.tier = req.body.tier;
  if ('xp' in req.body) update.xp = req.body.xp;
  if ('is_active' in req.body) update.is_active = Boolean(req.body.is_active);
  if ('is_recurring' in req.body) {
    update.is_recurring = Boolean(req.body.is_recurring);
    update.recurrence_type = update.is_recurring ? (req.body.recurrence_type ?? null) : null;
  } else if ('recurrence_type' in req.body) {
    update.recurrence_type = req.body.recurrence_type;
  }
  let wasCompleted = false;
  if ('is_completed' in req.body) {
    togglingCompletion = true;
    update.is_completed = Boolean(req.body.is_completed);
    update.completed_at = update.is_completed ? new Date().toISOString() : null;

    // Fetched up front so completion XP only fires on the not-completed -> completed
    // transition, not on every resend of is_completed: true for an already-completed quest.
    const { data: existing } = await supabaseAdmin.from('quests').select('is_completed').eq('id', req.params.id).eq('user_id', req.user.id).single();
    wasCompleted = Boolean(existing?.is_completed);
  }

  const { data: quest, error } = await supabaseAdmin
    .from('quests')
    .update(update)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!quest) return res.status(404).json({ error: 'Quest not found' });

  const justCompleted = togglingCompletion && update.is_completed && !wasCompleted;

  let finalQuest = quest;
  let xp = null;
  let streak = null;
  let dayStreak = null;

  if (justCompleted) {
    // Pre-bump streak length — "+10% per consecutive day" means days already banked going
    // into today's completion, not the count after this one increments it.
    const { data: streakRow } = await supabaseAdmin.from('streaks').select('current_streak').eq('user_id', req.user.id).maybeSingle();
    const streakDays = streakRow?.current_streak ?? 0;

    const { data: todaysCompleted } = await supabaseAdmin
      .from('quests')
      .select('category')
      .eq('user_id', req.user.id)
      .eq('date', quest.date)
      .eq('is_completed', true);
    const diversityBonus = new Set((todaysCompleted || []).map((q) => q.category)).size >= 3;

    const awardedXp = applyCompletionBonus(quest.xp || 15, streakDays, diversityBonus);

    const { data: updatedQuest } = await supabaseAdmin.from('quests').update({ xp: awardedXp }).eq('id', quest.id).select().single();
    finalQuest = updatedQuest || quest;

    streak = await bumpStreakIfDayComplete(req.user.id, quest.date);
    // Any completed quest is an accomplishment for the day streak, not just a full day's set.
    dayStreak = await bumpDailyStreak(req.user.id, requestTimezone(req));
    xp = await awardXp(req.user.id, awardedXp, 'quest completed').catch((err) => {
      console.error('[quests] XP award failed:', err.message);
      return null;
    });
  }

  res.json({ quest: finalQuest, streak, xp, dayStreak });
});

// DELETE /api/quests/:id — custom (user-created) quests only; system-generated ones can be
// paused (is_active: false) instead but not removed outright.
router.delete('/:id', async (req, res) => {
  const { data: quest, error: fetchError } = await supabaseAdmin
    .from('quests')
    .select('is_custom')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (fetchError || !quest) return res.status(404).json({ error: 'Quest not found' });
  if (!quest.is_custom) return res.status(403).json({ error: 'Only custom quests can be deleted — pause it instead' });

  const { error } = await supabaseAdmin.from('quests').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;

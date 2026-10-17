const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildTaskContent } = require('../lib/embeddingPipeline');
const { awardXp } = require('../lib/xpService');

const router = express.Router();
router.use(requireAuth);

const TASK_COMPLETE_XP = { low: 10, medium: 20, high: 30, critical: 50 };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

// Bumps the Task-completion streak (separate from quests.js's quest streak) the first time
// ANY task is completed on a given day — unlike the quest streak (which requires every one
// of that day's quests done), this fires on a single task. task_last_completed_date makes
// a second completion the same day a no-op, so the streak only ever advances once per day
// no matter how many tasks get finished.
async function bumpTaskStreak(userId, dateKey) {
  const { data: streak, error } = await supabaseAdmin
    .from('streaks')
    .select('task_current_streak, task_longest_streak, task_last_completed_date')
    .eq('user_id', userId)
    .single();
  if (error || !streak || streak.task_last_completed_date === dateKey) return null;

  const gap = streak.task_last_completed_date ? daysBetween(streak.task_last_completed_date, dateKey) : null;
  const nextCurrent = gap === 1 ? streak.task_current_streak + 1 : 1;
  const nextLongest = Math.max(streak.task_longest_streak, nextCurrent);

  const { error: updateError } = await supabaseAdmin
    .from('streaks')
    .update({
      task_current_streak: nextCurrent,
      task_longest_streak: nextLongest,
      task_last_completed_date: dateKey,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[tasks] bumpTaskStreak failed:', updateError.message);
    return null;
  }
  return nextCurrent;
}

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ tasks: data });
});

router.post('/', async (req, res) => {
  const { title, description, status, priority, activity_type, due_date, tags } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      user_id: req.user.id,
      title,
      description,
      status,
      priority,
      activity_type,
      due_date,
      tags,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'task',
    sourceId: data.id,
    content: buildTaskContent(data),
    metadata: { title: data.title, status: data.status, priority: data.priority },
  }).catch((err) => console.error('[tasks] embedding failed:', err.message));

  res.status(201).json({ task: data });
});

router.patch('/:id', async (req, res) => {
  const { title, description, status, priority, activity_type, due_date, tags } = req.body;

  // Fetched up front so completion XP only fires on the todo/in-progress -> done
  // transition, not on every subsequent edit of an already-done task (which would otherwise
  // resend status: 'done' and double-award).
  const { data: existing } = await supabaseAdmin.from('tasks').select('status').eq('id', req.params.id).eq('user_id', req.user.id).single();

  const update = { title, description, status, priority, activity_type, due_date, tags };
  // completed_at follows status unless the caller passes it explicitly.
  if (req.body.completed_at !== undefined) {
    update.completed_at = req.body.completed_at;
  } else if (status === 'done') {
    update.completed_at = new Date().toISOString();
  } else if (status) {
    update.completed_at = null;
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(update)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found' });

  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'task',
    sourceId: data.id,
    content: buildTaskContent(data),
    metadata: { title: data.title, status: data.status, priority: data.priority },
  }).catch((err) => console.error('[tasks] embedding failed:', err.message));

  let xp = null;
  let taskStreak = null;
  if (existing && existing.status !== 'done' && data.status === 'done') {
    xp = await awardXp(req.user.id, TASK_COMPLETE_XP[data.priority] || TASK_COMPLETE_XP.medium, 'task completed').catch((err) => {
      console.error('[tasks] XP award failed:', err.message);
      return null;
    });
    taskStreak = await bumpTaskStreak(req.user.id, todayKey());
  }

  res.json({ task: data, xp, taskStreak });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  deleteEmbedding(req.user.id, 'task', req.params.id).catch((err) =>
    console.error('[tasks] embedding delete failed:', err.message),
  );

  res.status(204).send();
});

module.exports = router;

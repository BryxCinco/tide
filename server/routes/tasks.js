const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildTaskContent } = require('../lib/embeddingPipeline');
const { awardXp } = require('../lib/xpService');
const { bumpDailyStreak, requestTimezone } = require('../lib/dailyStreak');
const { claimTaskXp } = require('../lib/taskXp');

const router = express.Router();
router.use(requireAuth);

const TASK_COMPLETE_XP = { low: 10, medium: 20, high: 30, critical: 50 };

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
  const { data: existing } = await supabaseAdmin.from('tasks').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  // A completed task is locked — no un-checking, editing or deleting — same as quests.
  if (existing.status === 'done') return res.status(409).json({ error: 'This task is already completed and can no longer be changed.', code: 'task_locked' });

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
    if (await claimTaskXp(existing)) {
      xp = await awardXp(req.user.id, TASK_COMPLETE_XP[data.priority] || TASK_COMPLETE_XP.medium, 'task completed').catch((err) => {
        console.error('[tasks] XP award failed:', err.message);
        return null;
      });
    }
    taskStreak = await bumpDailyStreak(req.user.id, requestTimezone(req));
  }

  res.json({ task: data, xp, taskStreak });
});

router.delete('/:id', async (req, res) => {
  const { data: existing } = await supabaseAdmin.from('tasks').select('status').eq('id', req.params.id).eq('user_id', req.user.id).maybeSingle();
  if (existing?.status === 'done') return res.status(409).json({ error: 'This task is already completed and can no longer be changed.', code: 'task_locked' });

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  deleteEmbedding(req.user.id, 'task', req.params.id).catch((err) =>
    console.error('[tasks] embedding delete failed:', err.message),
  );

  res.status(204).send();
});

module.exports = router;

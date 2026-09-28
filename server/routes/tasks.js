const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildTaskContent } = require('../lib/embeddingPipeline');

const router = express.Router();
router.use(requireAuth);

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
    .insert({ user_id: req.user.id, title, description, status, priority, activity_type, due_date, tags })
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

  res.json({ task: data });
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

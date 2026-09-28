const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildActivityContent } = require('../lib/embeddingPipeline');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ activities: data });
});

router.post('/', async (req, res) => {
  const { name, icon, color, category, is_favorite } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabaseAdmin
    .from('activities')
    .insert({ user_id: req.user.id, name, icon, color, category, is_favorite })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'activity',
    sourceId: data.id,
    content: buildActivityContent(data),
    metadata: { name: data.name, category: data.category },
  }).catch((err) => console.error('[activities] embedding failed:', err.message));

  res.status(201).json({ activity: data });
});

router.patch('/:id', async (req, res) => {
  const { name, icon, color, category, is_favorite, is_archived } = req.body;

  const { data, error } = await supabaseAdmin
    .from('activities')
    .update({ name, icon, color, category, is_favorite, is_archived })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Activity not found' });

  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'activity',
    sourceId: data.id,
    content: buildActivityContent(data),
    metadata: { name: data.name, category: data.category },
  }).catch((err) => console.error('[activities] embedding failed:', err.message));

  res.json({ activity: data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('activities').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  deleteEmbedding(req.user.id, 'activity', req.params.id).catch((err) =>
    console.error('[activities] embedding delete failed:', err.message),
  );

  res.status(204).send();
});

module.exports = router;

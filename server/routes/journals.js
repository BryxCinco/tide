const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildJournalContent } = require('../lib/embeddingPipeline');

const router = express.Router();
router.use(requireAuth);

function countWords(content) {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ entries: data });
});

router.post('/', async (req, res) => {
  const { title, content, mood, tags, is_favorite } = req.body;

  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert({ user_id: req.user.id, title, content, mood, tags, is_favorite, word_count: countWords(content) })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Fire-and-forget — not awaited, so a slow/failed embedding call never delays or fails
  // the response the user is waiting on for their own save.
  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'journal',
    sourceId: data.id,
    content: buildJournalContent(data),
    metadata: { title: data.title, mood: data.mood },
  }).catch((err) => console.error('[journals] embedding failed:', err.message));

  res.status(201).json({ entry: data });
});

router.patch('/:id', async (req, res) => {
  const { title, content, mood, tags, is_favorite } = req.body;

  const update = { title, content, mood, tags, is_favorite, updated_at: new Date().toISOString() };
  if (content !== undefined) update.word_count = countWords(content);

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .update(update)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Journal entry not found' });

  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'journal',
    sourceId: data.id,
    content: buildJournalContent(data),
    metadata: { title: data.title, mood: data.mood },
  }).catch((err) => console.error('[journals] embedding failed:', err.message));

  res.json({ entry: data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('journal_entries').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  deleteEmbedding(req.user.id, 'journal', req.params.id).catch((err) =>
    console.error('[journals] embedding delete failed:', err.message),
  );

  res.status(204).send();
});

module.exports = router;

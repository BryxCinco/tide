const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');

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
  res.json({ entry: data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('journal_entries').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;

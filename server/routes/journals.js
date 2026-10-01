const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildJournalContent } = require('../lib/embeddingPipeline');
const { awardXp } = require('../lib/xpService');
const { uploadJournalPhotos, deleteRemovedJournalPhotos, deleteIfOwned, JOURNAL_PHOTOS_BUCKET, MAX_JOURNAL_PHOTOS } = require('../lib/storage');

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
  const { title, content, mood, tags, is_favorite, photo_urls } = req.body;

  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });
  if (photo_urls && photo_urls.length > MAX_JOURNAL_PHOTOS) {
    return res.status(400).json({ error: `Up to ${MAX_JOURNAL_PHOTOS} photos per entry` });
  }

  let uploadedPhotoUrls;
  try {
    uploadedPhotoUrls = photo_urls ? await uploadJournalPhotos(photo_urls, req.user.id) : [];
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .insert({ user_id: req.user.id, title, content, mood, tags, is_favorite, word_count: countWords(content), photo_urls: uploadedPhotoUrls })
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

  const xp = await awardXp(req.user.id, 15, 'journal entry').catch((err) => {
    console.error('[journals] XP award failed:', err.message);
    return null;
  });

  res.status(201).json({ entry: data, xp });
});

router.patch('/:id', async (req, res) => {
  const { title, content, mood, tags, is_favorite, photo_urls } = req.body;

  if (photo_urls && photo_urls.length > MAX_JOURNAL_PHOTOS) {
    return res.status(400).json({ error: `Up to ${MAX_JOURNAL_PHOTOS} photos per entry` });
  }

  const update = { title, content, mood, tags, is_favorite, updated_at: new Date().toISOString() };
  if (content !== undefined) update.word_count = countWords(content);

  // photo_urls from the client is the full current list (a mix of kept public URLs and new
  // data: URIs for anything just picked) — diffed against what was there before so a removed
  // photo actually gets deleted from Storage, not just unlinked from the row.
  let existingPhotoUrls = null;
  if (photo_urls !== undefined) {
    const existing = await supabaseAdmin.from('journal_entries').select('photo_urls').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (existing.error) return res.status(404).json({ error: 'Journal entry not found' });
    existingPhotoUrls = existing.data.photo_urls || [];

    try {
      update.photo_urls = await uploadJournalPhotos(photo_urls, req.user.id);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .update(update)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Journal entry not found' });

  if (existingPhotoUrls) {
    deleteRemovedJournalPhotos(existingPhotoUrls, data.photo_urls).catch((err) =>
      console.error('[journals] removed-photo cleanup failed:', err.message),
    );
  }

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
  const { data, error } = await supabaseAdmin
    .from('journal_entries')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select('photo_urls')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  deleteEmbedding(req.user.id, 'journal', req.params.id).catch((err) =>
    console.error('[journals] embedding delete failed:', err.message),
  );

  for (const url of data?.photo_urls || []) {
    deleteIfOwned(url, JOURNAL_PHOTOS_BUCKET).catch((err) => console.error('[journals] photo delete failed:', err.message));
  }

  res.status(204).send();
});

module.exports = router;

const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { uploadIfDataUri, deleteIfOwned } = require('../lib/storage');

const router = express.Router();
router.use(requireAuth);

// avatar_url/cover_value arrive as base64 `data:` URIs when they're a fresh upload (see
// imageUpload.ts) — uploadIfDataUri() decodes and stores those in Supabase Storage and
// swaps in the resulting public URL before the row is written, so `profiles` only ever
// holds a short URL, never the image bytes themselves. Anything that isn't a `data:` URI
// (an existing URL, a gradient preset id, a hex color, null, undefined) passes through
// unchanged, so this same call works for both fields regardless of what kind of value
// they're currently holding.
router.patch('/', async (req, res) => {
  const { name, bio, avatar_url, cover_url, cover_type, cover_value } = req.body;

  try {
    // Read the current values first so a replaced upload's old file can be deleted after —
    // only relevant when at least one field is actually a new upload, but cheap enough to
    // just always do.
    const { data: previous } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url, cover_value')
      .eq('id', req.user.id)
      .single();

    const resolvedAvatarUrl = await uploadIfDataUri(avatar_url, `${req.user.id}/avatar`);
    const resolvedCoverValue = await uploadIfDataUri(cover_value, `${req.user.id}/cover`);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        name,
        bio,
        avatar_url: resolvedAvatarUrl,
        cover_url,
        cover_type,
        cover_value: resolvedCoverValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (previous && resolvedAvatarUrl !== previous.avatar_url) await deleteIfOwned(previous.avatar_url);
    if (previous && resolvedCoverValue !== previous.cover_value) await deleteIfOwned(previous.cover_value);

    res.json({ profile: data });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not process the uploaded image.' });
  }
});

module.exports = router;

const express = require('express');
const { supabaseAdmin } = require('../lib/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { upsertEmbedding, deleteEmbedding, buildSessionContent } = require('../lib/embeddingPipeline');
const { awardXp } = require('../lib/xpService');

const router = express.Router();
router.use(requireAuth);

const MAX_SESSION_SECONDS = 12 * 60 * 60;
// A device clock a few minutes ahead of the server's shouldn't get a real session rejected.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// GET /api/sessions?from=ISO&to=ISO — optional range filter over ended_at, else all.
router.get('/', async (req, res) => {
  let query = supabaseAdmin
    .from('time_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('ended_at', { ascending: false });

  if (req.query.from) query = query.gte('ended_at', req.query.from);
  if (req.query.to) query = query.lte('ended_at', req.query.to);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sessions: data });
});

router.post('/', async (req, res) => {
  const { activity_id, activity_name, duration_seconds, notes, tags, started_at, ended_at } = req.body;

  // XP is 1 per minute of duration, so both the duration and the timestamps have to be
  // believable — otherwise one request can buy any level.
  if (!Number.isInteger(duration_seconds) || duration_seconds <= 0 || duration_seconds > MAX_SESSION_SECONDS) {
    return res.status(400).json({ error: `duration_seconds must be a whole number from 1 to ${MAX_SESSION_SECONDS} (12 hours)` });
  }
  for (const [field, value] of [['started_at', started_at], ['ended_at', ended_at]]) {
    if (value === undefined || value === null) continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) return res.status(400).json({ error: `${field} is not a valid date` });
    if (time > Date.now() + CLOCK_SKEW_MS) return res.status(400).json({ error: `${field} cannot be in the future` });
  }

  const { data, error } = await supabaseAdmin
    .from('time_logs')
    .insert({
      user_id: req.user.id,
      activity_id,
      activity_name,
      duration_seconds,
      notes,
      tags,
      started_at,
      ended_at,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  upsertEmbedding({
    userId: req.user.id,
    sourceType: 'session',
    sourceId: data.id,
    content: buildSessionContent(data),
    metadata: { activity_name: data.activity_name, date: data.ended_at || data.started_at },
  }).catch((err) => console.error('[sessions] embedding failed:', err.message));

  const xp = await awardXp(req.user.id, Math.round((data.duration_seconds || 0) / 60), 'session logged').catch((err) => {
    console.error('[sessions] XP award failed:', err.message);
    return null;
  });

  res.status(201).json({ session: data, xp });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('time_logs').delete().eq('id', req.params.id).eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  deleteEmbedding(req.user.id, 'session', req.params.id).catch((err) =>
    console.error('[sessions] embedding delete failed:', err.message),
  );

  res.status(204).send();
});

module.exports = router;

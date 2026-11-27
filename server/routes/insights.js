const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProductivitySummary, getTimeSeries, getHeatmap, getActivityBreakdown, getQuestStats, getWaves } = require('../lib/insightsService');

const { insightsLimiter } = require('../lib/rateLimits');
const { parseTz, localKey } = require('../lib/localDay');

const router = express.Router();
router.use(requireAuth);
// After requireAuth: the limit is per signed-in user (req.user.id), not per IP.
router.use(insightsLimiter);

function parseDays(raw, fallback, max = 366) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

// Defaults to the user's local today (tz = minutes east of UTC, sent by the client).
function parseEndKey(raw, tz = 0) {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return localKey(new Date().toISOString(), tz);
}

// GET /api/insights/summary?days=N&end=YYYY-MM-DD — Productivity Score, Weekly Summary,
// and Tracked Time card data for one window, computed from one shared fetch.
router.get('/summary', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const tz = parseTz(req.query.tz);
    const end = parseEndKey(req.query.end, tz);
    res.json(await getProductivitySummary(req.user.id, days, end, tz));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/range?days=N&end=YYYY-MM-DD — { time, mood } for Time Tracked + Mood
// Trend, one entry per day in the window.
router.get('/range', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const tz = parseTz(req.query.tz);
    const end = parseEndKey(req.query.end, tz);
    res.json(await getTimeSeries(req.user.id, days, end, tz));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/heatmap?days=30&end=YYYY-MM-DD — always a fixed trailing window
// (the Heatmap card doesn't follow the range filter, same as before this was real data).
router.get('/heatmap', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 30);
    const tz = parseTz(req.query.tz);
    const end = parseEndKey(req.query.end, tz);
    res.json({ heatmap: await getHeatmap(req.user.id, days, end, tz) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/activity-breakdown?days=N&end=YYYY-MM-DD
router.get('/activity-breakdown', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const tz = parseTz(req.query.tz);
    const end = parseEndKey(req.query.end, tz);
    res.json({ activityBreakdown: await getActivityBreakdown(req.user.id, days, end, tz) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/quests?days=N&end=YYYY-MM-DD — Tide's Quest stats for the window.
router.get('/quests', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const tz = parseTz(req.query.tz);
    const end = parseEndKey(req.query.end, tz);
    res.json({ quests: await getQuestStats(req.user.id, days, end, tz) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/waves?days=7&end=YYYY-MM-DD&tz=480 — Wave Stats (Low/Mid/High/Tsunami)
// per local day. days is capped at 31.
router.get('/waves', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7, 31);
    const tz = parseTz(req.query.tz);
    const end = parseEndKey(req.query.end, tz);
    res.json({ waves: await getWaves(req.user.id, days, end, tz) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

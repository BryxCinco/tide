const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getProductivitySummary, getTimeSeries, getHeatmap, getActivityBreakdown } = require('../lib/insightsService');

const router = express.Router();
router.use(requireAuth);

function parseDays(raw, fallback, max = 366) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

function parseEndKey(raw) {
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

// GET /api/insights/summary?days=N&end=YYYY-MM-DD — Productivity Score, Weekly Summary,
// and Tracked Time card data for one window, computed from one shared fetch.
router.get('/summary', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const end = parseEndKey(req.query.end);
    res.json(await getProductivitySummary(req.user.id, days, end));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/range?days=N&end=YYYY-MM-DD — { time, mood } for Time Tracked + Mood
// Trend, one entry per day in the window.
router.get('/range', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const end = parseEndKey(req.query.end);
    res.json(await getTimeSeries(req.user.id, days, end));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/heatmap?days=30&end=YYYY-MM-DD — always a fixed trailing window
// (the Heatmap card doesn't follow the range filter, same as before this was real data).
router.get('/heatmap', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 30);
    const end = parseEndKey(req.query.end);
    res.json({ heatmap: await getHeatmap(req.user.id, days, end) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/activity-breakdown?days=N&end=YYYY-MM-DD
router.get('/activity-breakdown', async (req, res) => {
  try {
    const days = parseDays(req.query.days, 7);
    const end = parseEndKey(req.query.end);
    res.json({ activityBreakdown: await getActivityBreakdown(req.user.id, days, end) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

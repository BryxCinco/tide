const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { retrieveRelevantContext, buildContextString, retrieveStats } = require('../lib/ragService');

const router = express.Router();
router.use(requireAuth);

// GET /api/debug/rag?q=<query> — dev-only: exercises the full Phase 11.3 retrieval path
// (embed query -> pgvector similarity search -> stats) end to end and returns everything
// the AI Coach would actually see, so it can be verified with a plain curl before anything
// wires it into a real chat prompt.
router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query param "q" is required' });

  try {
    const [results, stats] = await Promise.all([retrieveRelevantContext(req.user.id, query), retrieveStats(req.user.id)]);

    res.json({
      query,
      context: buildContextString(results),
      results,
      stats,
    });
  } catch (err) {
    console.error('[debugRag] failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { retrieveRelevantContext, retrieveStats, buildContextString } = require('../lib/ragService');
const { generateResponse, generateResponseStream } = require('../lib/llmService');

const router = express.Router();
router.use(requireAuth);

// POST /api/chat — non-streaming response
router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    console.log(`[chat] user ${req.user.id.slice(0, 8)}: "${message.slice(0, 50)}..."`);

    // Retrieve context (Phase 11.3)
    const [context, stats] = await Promise.all([
      retrieveRelevantContext(req.user.id, message, { limit: 5, threshold: 0.2 }),
      retrieveStats(req.user.id, { days: 7 }),
    ]);

    // buildContextString (ragService.js, Phase 11.3) — not the raw `[TYPE]\ncontent` dump,
    // it groups by source_type into readable sections (dates formatted, durations converted
    // to "Xh Ym", etc.) which is exactly the format the system prompt's example responses
    // are written against.
    const contextStr = buildContextString(context);

    // Generate response
    const startTime = Date.now();
    const response = await generateResponse({
      userQuery: message,
      context: contextStr,
      stats,
      history,
    });
    const duration = Date.now() - startTime;

    console.log(`[chat] response in ${duration}ms, tokens: ${response.usage?.total_tokens}`);

    res.json({
      message: response.content,
      usage: response.usage,
      contextUsed: context.length,
      durationMs: duration,
    });
  } catch (err) {
    console.error('[chat] error:', err.message);
    res.status(500).json({
      error: 'Failed to generate response',
      detail: err.message,
    });
  }
});

// POST /api/chat/stream — streaming response via SSE
router.post('/stream', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Retrieve context
    const [context, stats] = await Promise.all([
      retrieveRelevantContext(req.user.id, message, { limit: 5, threshold: 0.2 }),
      retrieveStats(req.user.id, { days: 7 }),
    ]);

    const contextStr = buildContextString(context);

    // Send context info first
    res.write(`data: ${JSON.stringify({ type: 'context', count: context.length })}\n\n`);

    // Stream response
    try {
      for await (const chunk of generateResponseStream({
        userQuery: message,
        context: contextStr,
        stats,
        history,
      })) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error('[chat/stream] error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { retrieveRelevantContext, retrieveStats, buildContextString } = require('../lib/ragService');
const { generateResponse, generateResponseStream, generateWithTools } = require('../lib/llmService');

const router = express.Router();
router.use(requireAuth);

// A pasted essay would otherwise eat most of the model's context window on one message and
// (on this account's Groq tier) risks tipping a request over the tokens-per-minute limit by
// itself — see llmService.js's MODEL comment for how tight that budget already runs with the
// full 15-tool schema. ~2000 chars is generous for an actual chat message (a few paragraphs)
// while keeping worst-case prompt size predictable.
const MAX_MESSAGE_LENGTH = 2000;

// POST /api/chat — non-streaming response
router.post('/', async (req, res) => {
  try {
    const { history = [], timezone } = req.body;
    let { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.slice(0, MAX_MESSAGE_LENGTH);
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

    // Generate response — Phase 11.5: agentic, can call tools (create/complete tasks, log
    // mood, start a timer, read stats) instead of only ever answering in text.
    const startTime = Date.now();
    const response = await generateWithTools({
      userId: req.user.id,
      userQuery: message,
      context: contextStr,
      stats,
      history,
      timezone,
    });
    const duration = Date.now() - startTime;

    console.log(
      `[chat] response in ${duration}ms, tokens: ${response.usage?.total_tokens}, tools: ${response.toolsUsed.join(', ') || 'none'}`,
    );

    res.json({
      message: response.content,
      usage: response.usage,
      contextUsed: context.length,
      toolsUsed: response.toolsUsed,
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
    const { history = [], timezone } = req.body;
    let { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.slice(0, MAX_MESSAGE_LENGTH);
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
        timezone,
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

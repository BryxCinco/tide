const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { retrieveRelevantContext, retrieveStats, buildContextString } = require('../lib/ragService');
const { generateResponse, generateResponseStream, generateWithTools, generateInsightSuggestions } = require('../lib/llmService');
const { toolHandlers } = require('../lib/tools');

const router = express.Router();
router.use(requireAuth);

// Turns a Groq/llmService failure into exactly one of a few hand-written, friendly messages
// — never `err.message` itself, which for a Groq APIError is literally things like "Rate
// limit reached for model `qwen/...` on tokens per minute (TPM): Limit 6000, Used 5890,
// Requested 450. Please try again in 3.4s." (the "token token" wall of text this whole fix is
// for). The real message still goes to console.error below for debugging; the client only
// ever sees one of these three.
function friendlyChatError(err) {
  if (err?.status === 429) {
    return { status: 429, error: "TIDE Coach is getting a lot of requests right now. Please wait a moment and try again." };
  }
  if (err?.status === 503) {
    return { status: 503, error: 'TIDE Coach is temporarily unavailable. Please try again later.' };
  }
  if (err?.status === 400) {
    return { status: 400, error: "That message (or the conversation so far) is a bit too long for me to process. Try shortening it or starting a new chat." };
  }
  return { status: 500, error: 'Failed to generate a response. Please try again.' };
}

// Maps an executed tool call to a short "go look at it" action chip in the chat UI — a
// route, an icon, and (for tools whose result can represent an intermediate, nothing-
// actually-happened-yet step like "couldn't find that task" or "needs confirmation") a
// check for whether this particular result is a real, completed action. Tools left out
// entirely (getWeather, getLeaderboard, suggestTasks' plain suggestion list) have nowhere
// obviously useful to send the user, so they just don't get a chip.
const TOOL_ACTIONS = {
  createTask: { label: 'View in Tasks', route: '/tasks', icon: 'ListChecks' },
  completeTask: { label: 'View in Tasks', route: '/tasks', icon: 'ListChecks', isDone: (r) => r.matched !== false },
  listTasks: { label: 'View in Tasks', route: '/tasks', icon: 'ListChecks' },
  listMissedTasks: { label: 'View in Tasks', route: '/tasks', icon: 'AlertTriangle' },
  updateTask: { label: 'View in Tasks', route: '/tasks', icon: 'ListChecks', isDone: (r) => r.matched !== false },
  deleteTask: { label: 'View in Tasks', route: '/tasks', icon: 'ListChecks', isDone: (r) => r.deleted === true },
  rescheduleTask: { label: 'View in Tasks', route: '/tasks', icon: 'ListChecks', isDone: (r) => r.matched !== false && !r.needsConfirmation },

  logMood: { label: 'View Mood Trend', route: '/(tabs)/insights', icon: 'Smile' },
  getMoodHistory: { label: 'View Mood Trend', route: '/(tabs)/insights', icon: 'Smile' },

  startTimer: { label: 'Open Timer', route: '/timer', icon: 'Timer' },
  getTodayStats: { label: 'View Insights', route: '/(tabs)/insights', icon: 'BarChart3' },
  getWeeklySummary: { label: 'View Insights', route: '/(tabs)/insights', icon: 'BarChart3' },
  getActivityStats: { label: 'View Activities', route: '/activities', icon: 'Layers' },
  getStreakInfo: { label: 'View Insights', route: '/(tabs)/insights', icon: 'Flame' },
  getQuestStreak: { label: 'View Insights', route: '/(tabs)/insights', icon: 'Flame' },
  getLevelInfo: { label: 'View Profile', route: '/(tabs)/profile', icon: 'Trophy' },

  suggestActivity: { label: 'View Activities', route: '/activities', icon: 'Layers' },
  suggestTideQuest: { label: 'View Quests', route: '/', icon: 'Sparkles', isDone: (r) => r.added === true },
  generateDailyQuests: { label: 'View Quests', route: '/', icon: 'Sparkles' },

  addJournalEntry: { label: 'View in Journal', route: '/(tabs)/journal', icon: 'BookOpen' },
  searchJournals: { label: 'View in Journal', route: '/(tabs)/journal', icon: 'BookOpen', isDone: (r) => (r.count || 0) > 0 },
  reflectOnJournal: { label: 'View in Journal', route: '/(tabs)/journal', icon: 'BookOpen' },
};

// At most one chip per target screen — several tool calls landing on the same route in one
// turn (e.g. createTask then completeTask) shouldn't produce duplicate "View in Tasks"
// buttons — and at most 2 chips total so a multi-tool turn doesn't wall the reply in chips.
function buildChatActions(toolResults) {
  const actions = [];
  const seenRoutes = new Set();
  for (const { name, result } of toolResults) {
    const config = TOOL_ACTIONS[name];
    if (!config || (config.isDone && !config.isDone(result))) continue;
    if (seenRoutes.has(config.route)) continue;
    seenRoutes.add(config.route);
    actions.push({ label: config.label, route: config.route, icon: config.icon, summary: result.message });
  }
  return actions.slice(0, 2);
}

// A pasted essay would otherwise eat most of the model's context window on one message and
// (on this account's Groq tier) risks tipping a request over the tokens-per-minute limit by
// itself — see llmService.js's MODEL comment for how tight that budget already runs with the
// full 15-tool schema. ~2000 chars is generous for an actual chat message (a few paragraphs)
// while keeping worst-case prompt size predictable.
const MAX_MESSAGE_LENGTH = 2000;

// Semantic search over the user's own records only helps for messages with some substance.
// "yes", "ok thanks", "the first one" — confirmations and short follow-ups — get nothing
// useful from it, so they skip the embedding + vector search entirely.
const MIN_WORDS_FOR_RAG = 3;
// Upper bound on how long a reply waits for that search. The local embedding model takes a
// few seconds to load on a cold serverless instance; rather than make the user wait for it,
// the reply goes ahead without the extra context (stats are still included) while the model
// keeps loading in the background for the next message.
const RAG_TIMEOUT_MS = 2500;

function retrieveContextFast(userId, message) {
  if (message.trim().split(/\s+/).length < MIN_WORDS_FOR_RAG) return Promise.resolve([]);
  const search = retrieveRelevantContext(userId, message, { limit: 5, threshold: 0.2 }).catch((err) => {
    console.error('[chat] context retrieval failed:', err.message);
    return [];
  });
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(null), RAG_TIMEOUT_MS);
  });
  return Promise.race([search, timeout]).then((result) => {
    if (result === null) {
      console.log(`[chat] context retrieval exceeded ${RAG_TIMEOUT_MS}ms — answering without it`);
      return [];
    }
    return result;
  });
}

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

    // Retrieve context (Phase 11.3) — the vector search is skipped for short messages and
    // time-boxed otherwise (see retrieveContextFast); stats always run in parallel with it.
    const retrievalStart = Date.now();
    const [context, stats] = await Promise.all([
      retrieveContextFast(req.user.id, message),
      retrieveStats(req.user.id, { days: 7 }),
    ]);
    const retrievalMs = Date.now() - retrievalStart;

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
      `[chat] retrieval ${retrievalMs}ms, llm ${duration}ms, tokens: ${response.usage?.total_tokens}, tool groups: ${(response.toolGroups || []).join(',')}, tools used: ${response.toolsUsed.join(', ') || 'none'}`,
    );

    res.json({
      message: response.content,
      usage: response.usage,
      contextUsed: context.length,
      toolsUsed: response.toolsUsed,
      actions: buildChatActions(response.toolResults || []),
      durationMs: duration,
    });
  } catch (err) {
    console.error('[chat] error:', err.message);
    const { status, error } = friendlyChatError(err);
    res.status(status).json({ error });
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

    // Retrieve context (skipped for short messages, time-boxed otherwise)
    const [context, stats] = await Promise.all([
      retrieveContextFast(req.user.id, message),
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
      console.error('[chat/stream] error:', streamErr.message);
      res.write(`data: ${JSON.stringify({ type: 'error', error: friendlyChatError(streamErr).error })}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error('[chat/stream] error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: friendlyChatError(err).error })}\n\n`);
    res.end();
  }
});

// POST /api/chat/insights — Insights screen's "AI Suggestions" card. Deliberately ignores
// any activity-breakdown the client might send (the Insights screen's own donut chart is
// still mock data as of this writing) and builds `stats` entirely from real backend data:
// retrieveStats already computes focus time/streak/a genuine per-activity breakdown from
// time_logs, topped up with listMissedTasks' real overdue-task summary for the "priority"
// suggestion type.
router.post('/insights', async (req, res) => {
  try {
    const [stats, missed] = await Promise.all([
      retrieveStats(req.user.id, { days: 7 }),
      toolHandlers.listMissedTasks({ userId: req.user.id }),
    ]);

    const { suggestions, usage } = await generateInsightSuggestions({
      stats: {
        ...stats,
        overdueTaskCount: missed.count,
        overdueTaskTitles: (missed.tasks || []).slice(0, 5).map((t) => t.title),
      },
    });

    res.json({ suggestions, usage });
  } catch (err) {
    console.error('[chat/insights] error:', err.message);
    const { status, error } = friendlyChatError(err);
    res.status(status).json({ error });
  }
});

module.exports = router;

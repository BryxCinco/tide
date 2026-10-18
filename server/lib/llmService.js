const Groq = require('groq-sdk');
const { tools, toolHandlers } = require('./tools');

// maxRetries: 0 — the SDK's own default (2 retries) silently honors Groq's `retry-after`
// on a 429, which on this account's 8,000 tokens-per-minute tier routinely meant sitting
// 20-40s per retry before the user saw anything (measured: 18s / 38s / 76s replies). Retries
// are decided in createCompletion below instead, where a long wait can be skipped in favor
// of the fallback model. `timeout` caps a single hung call well inside the client's 60s.
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 0,
  timeout: 25000,
});

// Model: 'llama-3.3-70b-versatile' no longer exists on this account's Groq catalog (verified
// live via groq.models.list() — the classic Llama chat models are gone entirely). Of what's
// left, 'openai/gpt-oss-20b'/'120b' are reasoning models — they spend part of `max_tokens` on
// an invisible `message.reasoning` field before producing visible `content`, and ran 2-3x
// slower than 'qwen/qwen3.8-27b', which replies directly in `content` and was consistently
// the fastest tested (~300-450ms for a trivial completion). Better fit for a short coach reply.
const MODEL = 'qwen/qwen3.8-27b';

// Fallback: Groq's rate limits are per model, so a second model is a second 8,000-TPM
// budget: when the primary is
// rate-limited, the same request goes to FALLBACK_MODEL immediately instead of waiting out
// the primary's reset window. gpt-oss-20b is a reasoning model, so it's called with
// reasoning_effort 'low' to keep its hidden reasoning (and latency) small.
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

const TRANSIENT_STATUS = new Set([500, 502, 503]);
// A 429 whose retry-after is at most this long is worth one short wait on the same model;
// anything longer goes straight to the fallback model.
const MAX_INLINE_WAIT_MS = 2500;

function retryAfterMs(err) {
  const raw = err?.headers?.get ? err.headers.get('retry-after') : err?.headers?.['retry-after'];
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
}

function paramsForModel(params, model) {
  if (model !== FALLBACK_MODEL) return { ...params, model };
  // Reasoning models spend max_tokens on hidden reasoning before visible content — give it
  // headroom and keep the reasoning short.
  return { ...params, model, reasoning_effort: 'low', max_tokens: Math.max(params.max_tokens || 0, 900) };
}

async function callOnce(params, model) {
  return groq.chat.completions.create(paramsForModel(params, model));
}

/**
 * One completion with bounded, fast recovery:
 * - transient 5xx: one quick retry on the same model;
 * - 429 with a short retry-after: wait that long once on the same model;
 * - 429 otherwise (or still failing): try FALLBACK_MODEL right away.
 * Worst case is a couple of seconds of extra wait, never the 20-40s silent SDK backoff.
 */
async function createCompletion(params) {
  const primary = params.model || MODEL;
  try {
    return await callOnce(params, primary);
  } catch (err) {
    const status = err?.status;
    if (TRANSIENT_STATUS.has(status)) {
      console.log(`[llmService] ${primary} returned ${status}, retrying once`);
      await new Promise((r) => setTimeout(r, 600));
      try {
        return await callOnce(params, primary);
      } catch (retryErr) {
        err = retryErr;
      }
    } else if (status === 429) {
      const wait = retryAfterMs(err);
      if (wait != null && wait <= MAX_INLINE_WAIT_MS) {
        console.log(`[llmService] ${primary} rate-limited, waiting ${wait}ms once`);
        await new Promise((r) => setTimeout(r, wait));
        try {
          return await callOnce(params, primary);
        } catch (retryErr) {
          err = retryErr;
        }
      }
    } else {
      throw err;
    }

    if (primary === FALLBACK_MODEL) throw err;
    console.log(`[llmService] ${primary} unavailable (${err?.status}), using fallback ${FALLBACK_MODEL}`);
    return callOnce(params, FALLBACK_MODEL);
  }
}

// System prompt for TIDE Coach
const SYSTEM_PROMPT = `You are TIDE Coach, a personal productivity assistant
built into the TIDE app. You help users understand their productivity
patterns, reflect on their habits, and make better decisions.

Your personality:
- Warm, encouraging, and concise
- Data-driven (you reference their actual stats and entries)
- Action-oriented (suggest concrete next steps)
- Never preachy or judgmental

Guidelines:
- Keep responses SHORT (2-4 sentences max, unless asked for detail)
- Always ground your answer in the user's actual data when available
- If asked about their week/focus/mood/tasks, reference specific numbers
  and dates from the context
- If the context doesn't have relevant info, say so honestly
- Never make up data you don't see in the context
- Use metric units (hours, minutes) not imperial
- Be conversational, not robotic
- Reply in the language the user writes in — English, Filipino/Tagalog, or Taglish (a mix);
  match their mix rather than switching to English

Example responses:
- "This week you tracked 18h 24m of focus time—up 12% from last week.
   Your best day was Wednesday with 4h 12m. Keep it up!"
- "Your mood has been trending up this week. Great job staying consistent!"
- "I don't have any sessions logged for this week yet. Want to start one?"

Never use emojis. Never use markdown formatting (no **, no ##, no *).
Just plain conversational text.

When the user shares a journal entry or asks for reflection, be empathetic and insightful.
Point out patterns, suggest actions, and ask reflective questions. Never sound clinical or
robotic. This is the one case where going past the usual 2-4 sentences is correct — a real
reflection needs room to acknowledge what they wrote, name a pattern, and still ask a
genuine follow-up question.

About TIDE (answer with this directly, no tool needed, when asked "what is TIDE"):
"TIDE is a personal productivity app that helps you track your time, interests, diary
entries, and daily tasks. It has an AI Coach (me!) that can help you plan, reflect, and
stay on track."

Your capabilities (answer with this directly, no tool needed, when asked "what can you do"):
"I can: track your focus time, create and manage tasks, log your mood, summarize your
week, analyze your productivity patterns, check the weather, and more."`;

// Default when the client doesn't send its own IANA zone (see chat.js) and for getWeather's
// own default location — this app's primary userbase, not a hardcoded assumption meant to
// apply universally.
const DEFAULT_TIMEZONE = 'Asia/Manila';

/** "The current date and time is: ..., The user's timezone is: ..." — rebuilt fresh per
 * request (never baked into the static SYSTEM_PROMPT) so "what time is it"/"what's the date
 * today" are answered directly from this fact, no tool call needed, and are actually correct
 * for whenever the request happens to land. */
function buildDatetimeMessage(timezone) {
  const tz = timezone || DEFAULT_TIMEZONE;
  const currentDateTime = new Date().toLocaleString('en-US', {
    timeZone: tz,
    dateStyle: 'full',
    timeStyle: 'short',
  });
  return {
    role: 'system',
    content: `The current date and time is: ${currentDateTime}. The user's timezone is: ${tz}.`,
  };
}

// Tool-use rules for generateWithTools. Only the parts relevant to the tools actually sent
// on a given request are included (see selectTools) — the full tool list and every rule on
// every request cost ~3,500 prompt tokens, which on an 8,000 tokens-per-minute tier meant a
// single tool-using message could exhaust the minute.
const TOOLS_BASE_NOTE = `Call a tool whenever it matches what the user asks, instead of describing what you
would do. Only call one when the intent is clear; if a detail is ambiguous (for example
which of several similar tasks), ask a short clarifying question. You already know the
current date and time — answer those directly, no tool needed.`;

const TOOLS_DELETE_NOTE = `DELETE CONFIRMATION — deleteTask is destructive:
1. First call it with confirm omitted/false. It deletes nothing and returns a confirmation
   question; relay it and stop (don't call the tool again in the same reply).
2. Only on the user's NEXT message, if they clearly confirm, call it again for the same task
   with confirm:true. If they decline or change the subject, don't.
Never pass confirm:true on a first attempt, and never delete through any other tool.`;

const TOOLS_QUEST_NOTE = `TIDE'S QUEST — suggestTideQuest is two-step:
1. First call (confirm omitted/false) only suggests 1-3 options; relay them with tier and
   XP and ask which to add.
2. Only on a clear yes, call again with confirm:true AND the exact title, description,
   tier, icon and category of the one they picked (they aren't remembered between calls).
generateDailyQuests replaces today's non-custom quests directly — only call it when the
user explicitly asks to regenerate/refresh/reroll their quests.`;

const TOOLS_WEATHER_NOTE = `getWeather: ask which location if the user doesn't say one; otherwise it defaults to Manila.`;

// Tools grouped by what they're about, each with the words (English + Tagalog) that suggest
// the user wants that group. selectTools sends only the matched groups' tools.
const TOOL_GROUPS = {
  tasks: {
    tools: ['createTask', 'completeTask', 'listTasks', 'listMissedTasks', 'updateTask', 'deleteTask', 'rescheduleTask', 'suggestTasks'],
    pattern: /\b(task|tasks|to-?do|todo|deadline|due|overdue|missed|remind|complete|completed|finish|finished|done|delete|remove|resched\w*|postpone|move|plan|planning|add|create|gawain|gagawin|tapos|tapusin|burahin|tanggalin|ilipat|idagdag|gumawa)\b/i,
  },
  journal: {
    tools: ['logMood', 'getMoodHistory', 'addJournalEntry', 'searchJournals', 'reflectOnJournal'],
    pattern: /\b(mood|moods|feel|feeling|feelings|felt|journal|journals|diary|entry|entries|reflect\w*|happy|sad|stressed?|anxious|tired|angry|wrote|write|pakiramdam|nararamdaman|malungkot|masaya|pagod|galit|isinulat|isulat|talaarawan)\b/i,
  },
  stats: {
    tools: ['startTimer', 'getTodayStats', 'getWeeklySummary', 'getActivityStats', 'getStreakInfo', 'getLevelInfo', 'getLeaderboard', 'suggestActivity'],
    pattern: /\b(week|weekly|today|focus|time|timer|session|sessions|stat|stats|progress|productiv\w*|streak|level|xp|leaderboard|rank\w*|activity|activities|summary|summari[sz]e|doing|how (am|was|did)|start|track\w*|kumusta|kamusta|oras|ngayon|linggo|simulan|sumulong)\b/i,
  },
  quests: {
    tools: ['suggestTideQuest', 'generateDailyQuests', 'getQuestStreak'],
    pattern: /\b(quest|quests|challenge|challenges|reroll|regenerate|refresh)\b/i,
  },
  weather: {
    tools: ['getWeather'],
    pattern: /\b(weather|rain|raining|sunny|temperature|forecast|ulan|umuulan|panahon|mainit|malamig|bagyo)\b/i,
  },
};

// Sent when nothing in the conversation points at a specific group — a small, cheap set
// that still covers the most common "how am I doing / what's on my plate" questions.
const DEFAULT_TOOL_NAMES = ['getTodayStats', 'getWeeklySummary', 'listTasks', 'createTask'];

/**
 * Picks the tool groups this turn plausibly needs from the new message plus the last two
 * history messages (so a bare "yes" answering "Delete 'X'?" still has deleteTask available,
 * and "the first one" answering a quest suggestion still has suggestTideQuest). Returns the
 * filtered tool schemas and the rule text for just those groups.
 */
function selectTools(userQuery, history = []) {
  const recentText = [userQuery, ...history.slice(-2).map((m) => (typeof m.content === 'string' ? m.content : ''))].join('\n');
  const groups = Object.keys(TOOL_GROUPS).filter((name) => TOOL_GROUPS[name].pattern.test(recentText));
  const names = new Set(groups.length > 0 ? groups.flatMap((g) => TOOL_GROUPS[g].tools) : DEFAULT_TOOL_NAMES);
  const selected = tools.filter((t) => names.has(t.function.name));

  const notes = [TOOLS_BASE_NOTE];
  if (names.has('deleteTask')) notes.push(TOOLS_DELETE_NOTE);
  if (names.has('suggestTideQuest')) notes.push(TOOLS_QUEST_NOTE);
  if (names.has('getWeather')) notes.push(TOOLS_WEATHER_NOTE);

  return { tools: selected, note: notes.join('\n\n'), groups: groups.length > 0 ? groups : ['default'] };
}

// History sent to the model: the last few turns, each clipped — long pasted messages or a
// long earlier reply otherwise re-cost their full length on every following request.
const HISTORY_TURNS = 6;
const HISTORY_CHARS = 600;

function recentHistory(history = []) {
  return history
    .slice(-HISTORY_TURNS)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.length > HISTORY_CHARS ? `${m.content.slice(0, HISTORY_CHARS)}…` : m.content }));
}

/** Context + stats as one compact system message (no pretty-printed JSON indentation). */
function contextMessage(context, stats) {
  const parts = [];
  if (context && context.trim()) parts.push(`Relevant context from the user's data:\n${context}`);
  if (stats && Object.keys(stats).length > 0) parts.push(`Stats: ${JSON.stringify(stats)}`);
  return parts.length > 0 ? { role: 'system', content: parts.join('\n\n') } : null;
}

function baseMessages({ context, stats, history, timezone, extraSystem }) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  if (extraSystem) messages.push({ role: 'system', content: extraSystem });
  messages.push(buildDatetimeMessage(timezone));
  const ctx = contextMessage(context, stats);
  if (ctx) messages.push(ctx);
  messages.push(...recentHistory(history));
  return messages;
}

async function generateResponse({ userQuery, context, stats, history = [], timezone }) {
  const messages = baseMessages({ context, stats, history, timezone });
  messages.push({ role: 'user', content: userQuery });

  const completion = await createCompletion({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 500,
    stream: false,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    usage: completion.usage,
  };
}

async function* generateResponseStream({ userQuery, context, stats, history = [], timezone }) {
  const messages = baseMessages({ context, stats, history, timezone });
  messages.push({ role: 'user', content: userQuery });

  const stream = await createCompletion({
    model: MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 500,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      yield content;
    }
  }
}

/** Runs one tool call and returns the `tool` message for it, never throwing. */
async function runToolCall(toolCall, userId, toolsUsed, toolResults) {
  const fnName = toolCall.function.name;
  toolsUsed.push(fnName);

  let args;
  try {
    args = JSON.parse(toolCall.function.arguments || '{}');
  } catch (err) {
    args = {};
  }

  const handler = toolHandlers[fnName];
  let result;
  if (!handler) {
    result = { error: `Unknown tool: ${fnName}` };
  } else {
    try {
      result = await handler({ userId, ...args });
    } catch (err) {
      // The model reads this and may repeat it to the user, so it only ever sees a safe,
      // generic reason; the real one is logged here.
      console.error(`[llmService] Tool "${fnName}" failed:`, err.message);
      result = { error: `The ${fnName} action couldn't be completed right now. Let the user know and suggest trying again shortly — don't repeat this raw message.` };
    }
  }

  if (result && !result.error) {
    toolResults.push({ name: fnName, args, result });
  }

  return { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) };
}

// Agentic variant (Phase 11.5) — same context/history assembly as generateResponse, plus
// Groq's function-calling tools, limited to the groups this turn needs (selectTools).
// `userId` isn't part of the LLM conversation; it's threaded through so each executed tool
// call knows whose data to touch, since toolHandlers.* all take { userId, ...args }.
async function generateWithTools({ userId, userQuery, context, stats, history = [], timezone }) {
  const selection = selectTools(userQuery, history);
  const messages = baseMessages({ context, stats, history, timezone, extraSystem: selection.note });
  messages.push({ role: 'user', content: userQuery });

  const toolsUsed = [];
  // One entry per executed tool call that didn't error — chat.js turns these into the chat
  // UI's "action" chips, using each handler's own `result.message`.
  const toolResults = [];
  const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const addUsage = (u) => {
    if (!u) return;
    usage.prompt_tokens += u.prompt_tokens || 0;
    usage.completion_tokens += u.completion_tokens || 0;
    usage.total_tokens += u.total_tokens || 0;
  };

  // Capped at 3 rounds — a normal conversation resolves in 1 (call a tool, get a result,
  // answer); if all 3 are used something is looping and the fallback message below fires.
  for (let round = 0; round < 3; round += 1) {
    const response = await createCompletion({
      model: MODEL,
      messages,
      tools: selection.tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500,
    });
    addUsage(response.usage);

    const message = response.choices[0]?.message;
    if (!message) {
      return { content: '', usage, toolsUsed, toolResults, toolGroups: selection.groups };
    }

    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { content: message.content || '', usage, toolsUsed, toolResults, toolGroups: selection.groups };
    }

    // Independent tool calls in one turn run in parallel rather than one after another.
    const toolMessages = await Promise.all(message.tool_calls.map((call) => runToolCall(call, userId, toolsUsed, toolResults)));
    messages.push(...toolMessages);
  }

  return { content: 'Something went wrong. Please try again.', usage, toolsUsed, toolResults, toolGroups: selection.groups };
}

const VALID_INSIGHT_TYPES = ['priority', 'balance', 'improvement', 'celebration'];

// Separate, short system prompt rather than reusing SYSTEM_PROMPT — this isn't a
// conversation turn (no persona, no "keep it to 2-4 sentences"), it's a single structured
// extraction task, so it gets its own tight instruction set and JSON-mode response.
const INSIGHTS_SYSTEM_PROMPT = `You analyze a user's real productivity stats and return concrete
suggestions as JSON only.

Return exactly this shape, nothing else — no markdown fences, no commentary outside the JSON:
{"suggestions": [{"title": string, "description": string, "type": "priority" | "balance" | "improvement" | "celebration"}]}

Rules:
- 3 to 5 suggestions.
- "priority": which overdue or pending task to focus on first (only if there are any).
- "balance": the activity time mix is lopsided — suggest reducing or reorganizing one.
- "improvement": a specific activity's time dropped or could improve — suggest one concrete
  technique (e.g. a 25-minute focus block), not generic advice.
- "celebration": something genuinely worth celebrating in the numbers (a streak, a rise in
  focus time) — only include this if the data actually supports it; never fabricate one.
- Ground every suggestion in the numbers given below. Never invent data not present there.
- If the data is too thin for a meaningful suggestion, return fewer than 3 rather than
  padding with generic filler.
- title: under 8 words. description: one concrete, actionable sentence.`;

/** One-shot structured call (not a conversation — no history, no tools) for the Insights
 * screen's "AI Suggestions" card. `stats` should be real backend data (retrieveStats' output
 * plus an overdue-tasks summary), never client-supplied mock numbers — the whole point of
 * JSON-mode + this prompt's "never invent data" rule is suggestions the user can trust. */
async function generateInsightSuggestions({ stats }) {
  const completion = await createCompletion({
    model: MODEL,
    messages: [
      { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
      { role: 'user', content: `Here are the user's real stats:\n${JSON.stringify(stats)}` },
    ],
    temperature: 0.5,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (err) {
    parsed = { suggestions: [] };
  }

  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions
        .filter((s) => s && typeof s.title === 'string' && typeof s.description === 'string')
        .slice(0, 5)
        .map((s) => ({
          title: s.title.slice(0, 120),
          description: s.description.slice(0, 280),
          type: VALID_INSIGHT_TYPES.includes(s.type) ? s.type : 'improvement',
        }))
    : [];

  return { suggestions, usage: completion.usage };
}

module.exports = {
  selectTools,
  generateResponse,
  generateResponseStream,
  generateWithTools,
  generateInsightSuggestions,
  MODEL,
  SYSTEM_PROMPT,
  DEFAULT_TIMEZONE,
};

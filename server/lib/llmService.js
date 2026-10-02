const Groq = require('groq-sdk');
const { tools, toolHandlers } = require('./tools');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Model: 'llama-3.3-70b-versatile' no longer exists on this account's Groq catalog (verified
// live via groq.models.list() — the classic Llama chat models are gone entirely; only
// allam-2-7b, canopylabs/orpheus-*, whisper-*, and openai/gpt-oss-* remain). Of what's left,
// 'openai/gpt-oss-20b'/'120b' are reasoning models — they spend part of `max_tokens` on an
// invisible `message.reasoning` field before producing visible `content`, which returned
// empty output entirely at this file's own max_tokens: 500 setting in a quick test with a
// low budget, and ran 2-3x slower than the alternative even once given enough tokens to
// finish reasoning. 'qwen/qwen3.8-27b' has no such split, replies directly in `content`
// only, and was consistently the fastest of the three tested (~300ms for a trivial
// completion vs ~800ms for gpt-oss-20b) — the better fit for a short, low-latency coach
// reply either way.
const MODEL = 'qwen/qwen3.8-27b';

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

// Appended only for generateWithTools — plain generateResponse/generateResponseStream never
// have tools available, so this instruction would be dead weight there.
const TOOLS_SAFETY_NOTE = `You have access to these tools — call one whenever it matches
what the user is asking for, instead of just describing what you would do:

Tasks: createTask, listTasks, listMissedTasks, updateTask, completeTask, rescheduleTask,
deleteTask, suggestTasks
Mood & journal: logMood, getMoodHistory, addJournalEntry, searchJournals, reflectOnJournal
Time & stats: startTimer, getTodayStats, getWeeklySummary, getActivityStats, getStreakInfo,
suggestActivity, getLevelInfo, getLeaderboard
Tide's Quest: suggestTideQuest, generateDailyQuests, getQuestStreak
Other: getWeather (ask which location if the user doesn't say one and hasn't got a usual
city from context — otherwise it defaults to Manila)

You already know the current date and time (see below) and don't need a tool for "what
time is it" or "what's the date today" — just answer directly from that fact.

DELETE CONFIRMATION — deleteTask is destructive and has a required two-step flow:
1. First call deleteTask with confirm omitted/false. It will NOT delete anything — it just
   returns a message asking the user to confirm. Relay that exact message to the user and
   stop there; do not call the tool again in the same reply.
2. Only on the user's NEXT message, if they clearly say yes/confirm/do it/go ahead (and are
   replying to that same confirmation question), call deleteTask again for the same task
   with confirm:true. If they decline or change the subject, do not call it again.
Never pass confirm:true on a first attempt, and never delete anything via updateTask or any
other tool as a workaround.

TIDE'S QUEST CONFIRMATION — suggestTideQuest follows the same two-step shape:
1. First call with confirm omitted/false only analyzes and suggests 1-3 options — nothing is
   created. Relay them (with tier and XP) and ask which, if any, they'd like added.
2. Only on a clear yes, call it again with confirm:true AND the exact title, description,
   tier, icon, and category of the ONE they picked (these aren't remembered between calls —
   you have to pass them back).
generateDailyQuests has no confirmation step — it directly replaces today's non-custom
quests, so only call it when the user clearly asks to regenerate/refresh/reroll their quests
(not as a side effect of answering some other question).

Only call a tool when the user's intent is clear and unambiguous; if a detail is genuinely
ambiguous (for example, which of several similarly-named tasks they mean), ask a short
clarifying question instead of guessing.`;

async function generateResponse({ userQuery, context, stats, history = [], timezone }) {
  // Build messages array
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, buildDatetimeMessage(timezone)];

  // Add context as a system message if available
  if (context && context.trim()) {
    messages.push({
      role: 'system',
      content: `Here is the user's relevant context:\n\n${context}\n\nStats:\n${JSON.stringify(stats, null, 2)}`,
    });
  }

  // Add conversation history (last 10 messages)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current query
  messages.push({ role: 'user', content: userQuery });

  const completion = await groq.chat.completions.create({
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
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }, buildDatetimeMessage(timezone)];

  if (context && context.trim()) {
    messages.push({
      role: 'system',
      content: `Here is the user's relevant context:\n\n${context}\n\nStats:\n${JSON.stringify(stats, null, 2)}`,
    });
  }

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: userQuery });

  const stream = await groq.chat.completions.create({
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

// Agentic variant (Phase 11.5) — same context/history assembly as generateResponse, plus
// Groq's function-calling tools. `userId` isn't part of the LLM conversation at all; it's
// threaded through purely so each executed tool call knows whose data to touch, since
// toolHandlers.* all take { userId, ...args }.
async function generateWithTools({ userId, userQuery, context, stats, history = [], timezone }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: TOOLS_SAFETY_NOTE },
    buildDatetimeMessage(timezone),
  ];

  if (context && context.trim()) {
    messages.push({
      role: 'system',
      content: `Here is the user's relevant context:\n\n${context}\n\nStats:\n${JSON.stringify(stats, null, 2)}`,
    });
  }

  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: 'user', content: userQuery });

  const toolsUsed = [];
  let rounds = 0;

  // Capped at 3 rounds of tool calls — a well-behaved conversation resolves in 1 (call a
  // tool, get a result, answer), so 3 is headroom for a multi-step request, not a budget
  // meant to be exhausted; if it is, something's looping and the fallback message below fires.
  while (rounds < 3) {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500,
    });

    const message = response.choices[0]?.message;
    if (!message) {
      return { content: '', usage: response.usage, toolsUsed };
    }

    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return { content: message.content || '', usage: response.usage, toolsUsed };
    }

    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      toolsUsed.push(fnName);

      let args;
      try {
        args = JSON.parse(toolCall.function.arguments);
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
          result = { error: err.message };
        }
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    rounds += 1;
  }

  return { content: "Something went wrong. Please try again.", usage: null, toolsUsed };
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
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
      { role: 'user', content: `Here are the user's real stats:\n${JSON.stringify(stats, null, 2)}` },
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
  generateResponse,
  generateResponseStream,
  generateWithTools,
  generateInsightSuggestions,
  MODEL,
  SYSTEM_PROMPT,
  DEFAULT_TIMEZONE,
};

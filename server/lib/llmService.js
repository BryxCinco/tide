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
Just plain conversational text.`;

// Appended only for generateWithTools — plain generateResponse/generateResponseStream never
// have tools available, so this instruction would be dead weight there.
const TOOLS_SAFETY_NOTE = `You have access to tools that can create tasks, complete tasks,
log mood, start a timer, and read the user's stats. If the user asks you to DELETE or REMOVE
something (a task, a journal entry, a session), DO NOT do it — no delete tool exists yet.
Instead say you can't delete it yet and ask them to confirm what they want, or do it from
the app directly. Only call a tool when the user's intent is clear and unambiguous; if a
detail is genuinely ambiguous (for example, which of several similarly-named tasks to
complete), ask a short clarifying question instead of guessing.`;

async function generateResponse({ userQuery, context, stats, history = [] }) {
  // Build messages array
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

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

async function* generateResponseStream({ userQuery, context, stats, history = [] }) {
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

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
async function generateWithTools({ userId, userQuery, context, stats, history = [] }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: TOOLS_SAFETY_NOTE },
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

module.exports = {
  generateResponse,
  generateResponseStream,
  generateWithTools,
  MODEL,
  SYSTEM_PROMPT,
};

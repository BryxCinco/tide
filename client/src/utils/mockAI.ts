/** Simulated "thinking" delay before a mock response — long enough for the typing
 * indicator to actually register as a UI state, short enough not to feel laggy. */
export const MOCK_AI_THINKING_DELAY = 1000;

interface KeywordRule {
  pattern: RegExp;
  respond: (firstName: string) => string;
}

// Order matters — checked top to bottom, first match wins. Greeting/thanks are checked
// last-ish but before the default so a message like "thanks for the tip" still matches
// "tip" first, which is arguably the more useful response; this is a mock, not NLU.
const RULES: KeywordRule[] = [
  {
    pattern: /\b(week|summary)\b/i,
    respond: () =>
      'This week you tracked 18h 24m of focus time. Your best day was Wednesday with 4h 12m. Keep it up!',
  },
  {
    pattern: /\b(focus|what should)\b/i,
    respond: () =>
      "Based on your patterns, mornings are your most productive time. Try scheduling deep work sessions between 9-11 AM.",
  },
  {
    pattern: /\b(tip|advice)\b/i,
    respond: () =>
      'Tip: Try the Pomodoro technique — 25 min focus, 5 min break. Studies show it improves focus by 30%.',
  },
  {
    pattern: /\btask\b/i,
    respond: () =>
      "You have 3 open tasks. The 'Review PR' task is high priority. Want me to help break it down?",
  },
  {
    pattern: /\bmood\b/i,
    respond: () => 'Your mood has been trending up this week. Great job!',
  },
  {
    pattern: /\b(hi|hello|hey)\b/i,
    respond: (firstName) => `Hey ${firstName}! Ready to make today productive? What's on your mind?`,
  },
  {
    pattern: /\b(thanks|thank you)\b/i,
    respond: () => "You're welcome! Keep up the great work.",
  },
];

const DEFAULT_RESPONSE = "I'm still learning. Try asking about your week, focus, tasks, or mood.";

/**
 * Keyword-matched canned responses — a stand-in for the real AI coach (Phase 10 wires
 * this up to an actual backend/LLM call). Deliberately simple substring/word matching,
 * not real NLU, since the point right now is to prove out the chat UI end-to-end.
 */
export function getMockAIResponse(userMessage: string, userName?: string): string {
  const firstName = userName?.trim().split(/\s+/)[0] ?? 'there';
  const rule = RULES.find((r) => r.pattern.test(userMessage));
  return rule ? rule.respond(firstName) : DEFAULT_RESPONSE;
}

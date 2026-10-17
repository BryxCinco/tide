import { api, AUTH_TOKEN_KEY, getApiErrorMessage } from './api';
import { storage } from '../utils/storage';
import type { ChatAction, ChatMessage } from '../types/chat';

export interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResponse {
  message: string;
  usage: ChatUsage | null;
  contextUsed: number;
  toolsUsed?: string[];
  actions?: ChatAction[];
  durationMs: number;
}

export type InsightSuggestionType = 'priority' | 'balance' | 'improvement' | 'celebration';

export interface InsightSuggestion {
  title: string;
  description: string;
  type: InsightSuggestionType;
}

function toApiHistory(history: ChatMessage[]) {
  return history.map((m) => ({ role: m.role, content: m.content }));
}

// api.ts's shared 15s default is tuned for ordinary CRUD calls — too tight for an LLM round
// trip, which can genuinely take longer than that once tool-calling (up to 3 rounds, each its
// own Groq request) and llmService.js's own retry-on-429 (up to 2 extra attempts) are in play.
// Overridden per-request here rather than raising the global default, so a hung/broken request
// to a normal endpoint still fails fast instead of hanging for a full minute.
const CHAT_TIMEOUT_MS = 60000;

/** The device's real IANA zone (e.g. "Asia/Manila", "America/New_York") — sent with every
 * request so "what time is it"/"what's the date today" answer correctly for THIS user
 * instead of the server's own timezone or a hardcoded default (see llmService.js's
 * buildDatetimeMessage, which falls back to Asia/Manila only when this is omitted). */
function getDeviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export const chatService = {
  /** POST /api/chat — non-streaming, but the ONLY endpoint with tool-calling (Phase 11.5:
   * createTask/completeTask/listTasks/logMood/startTimer/getTodayStats/getWeeklySummary).
   * chatStore uses this one by default and fakes the token-by-token reveal on the client
   * (see chatStore.ts's `revealMessage`) — see that file's comment for why. */
  async sendMessage(message: string, history: ChatMessage[]): Promise<ChatResponse> {
    try {
      const { data } = await api.post<ChatResponse>(
        '/api/chat',
        {
          message,
          history: toApiHistory(history),
          timezone: getDeviceTimezone(),
        },
        { timeout: CHAT_TIMEOUT_MS },
      );
      return data;
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  },

  /** POST /api/chat/insights — Insights screen's "AI Suggestions" card. No request body:
   * the server builds its own real stats (focus time, streak, a genuine per-activity
   * breakdown, overdue tasks) rather than trusting whatever the client has on screen, since
   * the Insights screen's own Activity Breakdown chart is still mock data. */
  async getInsightSuggestions(): Promise<InsightSuggestion[]> {
    try {
      const { data } = await api.post<{ suggestions: InsightSuggestion[] }>(
        '/api/chat/insights',
        undefined,
        { timeout: CHAT_TIMEOUT_MS },
      );
      return data.suggestions;
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  },

  /** POST /api/chat/stream — real SSE token-by-token streaming, but text-only (no tools;
   * the backend only wires generateWithTools into the non-streaming route — see
   * server/routes/chat.js). Not used by chatStore today (tool-calling was judged more
   * valuable than real network streaming for the actual AI Coach UI), kept here as a
   * working, ready-to-use capability for a future surface that doesn't need tools. */
  async *streamMessage(message: string, history: ChatMessage[]): AsyncGenerator<string> {
    const token = await storage.getItem(AUTH_TOKEN_KEY);
    const baseURL = api.defaults.baseURL || 'http://localhost:5000';

    const response = await fetch(`${baseURL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history: toApiHistory(history), timezone: getDeviceTimezone() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        // Parsing and error-handling are split into separate try/catches — combining them
        // (as a first draft of this did) meant a real `{type:'error'}` event thrown below
        // was caught by the same block meant only to skip malformed JSON, silently
        // swallowing genuine backend errors instead of surfacing them to the caller.
        let data: { type?: string; content?: string; error?: string };
        try {
          data = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        if (data.type === 'chunk' && data.content) {
          yield data.content;
        } else if (data.type === 'done') {
          return;
        } else if (data.type === 'error') {
          throw new Error(data.error || 'Stream error');
        }
      }
    }
  },
};

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { chatService } from '../services/chat.service';
import { showToast } from './toastStore';
import type { ChatMessage } from '../types/chat';
import { storage } from '../utils/storage';

interface ChatState {
  messages: ChatMessage[];
  /** False until persisted chat history has finished loading from storage — the composer's
   * async `storage.getItem` (SecureStore/localStorage) means there's always at least one
   * tick where persisted messages genuinely aren't in memory yet, not just a formality.
   * app/chat.tsx shows a skeleton instead of the real (momentarily-empty) conversation
   * until this flips true. */
  hasHydrated: boolean;
  isTyping: boolean;
  /** True only while a real response's text is being revealed word-by-word on screen —
   * see `revealMessage` below. ChatPanel.tsx hides its own "Thinking..." status line
   * whenever this is true, since the revealing bubble itself is the activity indicator. */
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string, userName?: string) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/chat (the only endpoint with tool-calling — createTask, completeTask, logMood,
// startTimer, listTasks, getTodayStats, getWeeklySummary; see server/lib/tools.js) returns
// its full answer in one shot rather than streaming it. Revealing it word-by-word here gives
// the same token-by-token feel as real SSE streaming without giving up tool-calling, which
// only the non-streaming route supports (server/routes/chat.js keeps /stream tools-free on
// purpose). ~18ms/word keeps even a 60-word reply well under a second to fully reveal.
const REVEAL_MS_PER_WORD = 18;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      hasHydrated: false,
      isTyping: false,
      isStreaming: false,
      error: null,

      sendMessage: async (content, _userName) => {
        // `userName` is kept in the signature only so ChatPanel.tsx's existing
        // `sendMessage(content, user?.name)` call site didn't need to change — the real
        // backend already knows who's asking from the auth token and pulls their name/
        // context via RAG (ragService.js), so there's nothing left for the client to pass.
        const trimmed = content.trim();
        // Guards the whole request lifecycle, not just the network wait — isTyping flips
        // back to false the instant the reply starts revealing (see revealMessage below),
        // so checking only isTyping would let a rapid second send slip in mid-reveal and
        // interleave two replies. isStreaming covers that remaining window.
        if (!trimmed || get().isTyping || get().isStreaming) return;

        const userMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
        };

        const historyBeforeThisMessage = get().messages;
        set((state) => ({ messages: [...state.messages, userMessage], isTyping: true, error: null }));

        try {
          const response = await chatService.sendMessage(trimmed, historyBeforeThisMessage);
          await revealMessage(set, response.message);
        } catch (err) {
          // chatService/the server already translate Groq/network failures into one of a
          // small set of friendly messages (see server/routes/chat.js's friendlyChatError) —
          // err.message is expected to already be safe to show. This still logs the raw error
          // separately rather than trusting that blindly, so an unexpected shape (a genuinely
          // raw technical message slipping through) is visible here for debugging without
          // ever being more exposed to the user than the toast already is.
          console.log('[chatStore] sendMessage failed:', err);
          const message = err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
          set({ isTyping: false, isStreaming: false, error: message });
          showToast(message, 'error');
        }
      },

      clearChat: () => set({ messages: [], isTyping: false, isStreaming: false, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'tide_chat',
      storage: createJSONStorage(() => storage),
      // isTyping/isStreaming/error are all transient — persisting them could strand the UI
      // mid-"thinking" (or showing a stale error) if the app closes mid-request. hasHydrated
      // itself is never persisted either — it's set fresh by onRehydrateStorage below every
      // time this store loads, not restored from a prior run.
      partialize: (state) => ({ messages: state.messages }),
      onRehydrateStorage: () => () => {
        useChatStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/** Adds the assistant's message once, then grows its `content` a few words at a time so it
 * reads as a live reply instead of appearing all at once — see REVEAL_MS_PER_WORD's comment
 * for why this isn't real network streaming. */
async function revealMessage(set: (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void, fullText: string): Promise<void> {
  const aiMessageId = `msg_${Date.now()}_ai`;
  const words = fullText.split(' ');

  set((state) => ({
    messages: [...state.messages, { id: aiMessageId, role: 'assistant', content: '', timestamp: new Date().toISOString() }],
    isTyping: false,
    isStreaming: true,
  }));

  let revealed = '';
  for (const word of words) {
    revealed = revealed ? `${revealed} ${word}` : word;
    set((state) => ({
      messages: state.messages.map((m) => (m.id === aiMessageId ? { ...m, content: revealed } : m)),
    }));
    await wait(REVEAL_MS_PER_WORD);
  }

  set({ isStreaming: false });
}

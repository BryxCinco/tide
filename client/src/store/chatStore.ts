import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ChatMessage } from '../types/chat';
import { getMockAIResponse, MOCK_AI_THINKING_DELAY } from '../utils/mockAI';
import { storage } from '../utils/storage';

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  sendMessage: (content: string, userName?: string) => Promise<void>;
  clearChat: () => void;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isTyping: false,

      sendMessage: async (content, userName) => {
        const trimmed = content.trim();
        if (!trimmed || get().isTyping) return;

        const userMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'user',
          content: trimmed,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({ messages: [...state.messages, userMessage], isTyping: true }));

        // Simulated "thinking" delay — see mockAI.ts. Phase 10 replaces this whole
        // function body with a real request; the store's public shape (messages,
        // isTyping, sendMessage, clearChat) doesn't need to change when that happens.
        await wait(MOCK_AI_THINKING_DELAY);

        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: getMockAIResponse(trimmed, userName),
          timestamp: new Date().toISOString(),
        };

        set((state) => ({ messages: [...state.messages, assistantMessage], isTyping: false }));
      },

      clearChat: () => set({ messages: [], isTyping: false }),
    }),
    {
      name: 'tide_chat',
      storage: createJSONStorage(() => storage),
      // isTyping is transient — persisting it could strand the UI mid-"thinking" if the
      // app closes during the simulated delay.
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
);

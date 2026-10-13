import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { useChatStore } from '../../store/chatStore';
import type { QuickSuggestion } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { colors } from '../../utils/theme';
import { Text } from '../ui';
import { AIAvatar } from './AIAvatar';
import { ChatBubble } from './ChatBubble';
import { QuickSuggestions } from './QuickSuggestions';
import { SmartSuggestions } from './SmartSuggestions';
import { TypingIndicator } from './TypingIndicator';

export interface ChatConversationProps {
  userFirstName?: string;
  /** Starter suggestion grid, rendered inside the same empty-state block as the greeting.
   * Omit once there's a conversation. */
  quickSuggestions?: {
    suggestions: QuickSuggestion[];
    onSelect: (label: string) => void;
  };
  /** Context-aware follow-up chips (Fix 7) under the latest AI reply — the caller (app/
   * chat.tsx) decides visibility (hidden once the user starts typing a new message or while
   * a reply is in flight); this just needs somewhere to send the tapped label. */
  onSelectSuggestion: (label: string) => void;
  showSmartSuggestions: boolean;
}

/**
 * The scrollable message list — empty-state greeting, bubbles, typing indicator, smart
 * suggestions, and auto-scroll-to-bottom. Used only by app/chat.tsx (the full-page AI Coach
 * — Fix 5 retired the old ChatPanel.tsx modal, which used to share this component).
 */
export function ChatConversation({
  userFirstName,
  quickSuggestions,
  onSelectSuggestion,
  showSmartSuggestions,
}: ChatConversationProps) {
  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const scrollRef = useRef<ScrollView>(null);

  // Message ids already present when this screen mounted (i.e. restored from persisted
  // history) never get the avatar's spin-in flourish — only ones that arrive afterward,
  // live in this session, are "new" for that purpose (Fix 6).
  const sessionStartIds = useRef<Set<string> | null>(null);
  if (sessionStartIds.current === null) {
    sessionStartIds.current = new Set(messages.map((m) => m.id));
  }

  useEffect(() => {
    // Fires after the new bubble/typing-indicator has actually laid out, not before.
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, isTyping, isStreaming]);

  const lastMessage = messages[messages.length - 1];
  const lastMessageIsAssistant = lastMessage?.role === 'assistant';

  return (
    <View className="flex-1">
      {/* Teal → transparent wash at the top of the messages area (Fix 6) — purely
          decorative, so it sits above the ScrollView but never intercepts touches. */}
      <LinearGradient
        colors={[hexToRgba(colors.brand.tideTeal, 0.08), 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, zIndex: 1 }}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-3 py-4"
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !isTyping && (
          <View className="items-center gap-6 px-8 py-10">
            <View className="items-center">
              <AIAvatar size={56} />
              <Text variant="h3" color="primary" className="mt-4 text-center">
                Hey{userFirstName ? `, ${userFirstName}` : ''}!
              </Text>
              <Text variant="body" color="muted" className="mt-1 text-center">
                Ask me about your week, focus time, tasks, or mood.
              </Text>
            </View>
            {quickSuggestions && (
              <QuickSuggestions suggestions={quickSuggestions.suggestions} onSelect={quickSuggestions.onSelect} />
            )}
          </View>
        )}

        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            isStreamingCursor={isStreaming && message.id === lastMessage?.id}
            isNewMessage={!sessionStartIds.current!.has(message.id)}
          />
        ))}

        {isTyping && !isStreaming && (
          <View className="flex-row items-end gap-2 px-4">
            <AIAvatar size={28} pulse />
            <View className="rounded-2xl rounded-bl-sm bg-elevated px-4 py-3">
              <TypingIndicator />
            </View>
          </View>
        )}

        {showSmartSuggestions && lastMessageIsAssistant && (
          <SmartSuggestions lastAssistantMessage={lastMessage.content} onSelect={onSelectSuggestion} />
        )}
      </ScrollView>
    </View>
  );
}

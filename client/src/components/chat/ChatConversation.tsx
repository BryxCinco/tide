import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { useChatStore } from '../../store/chatStore';
import type { QuickSuggestion } from '../../types/chat';
import { Text } from '../ui';
import { AIAvatar } from './AIAvatar';
import { ChatBubble } from './ChatBubble';
import { QuickSuggestions } from './QuickSuggestions';
import { TypingIndicator } from './TypingIndicator';

export interface ChatConversationProps {
  userFirstName?: string;
  avatarSize?: number;
  /** ChatPanel.tsx shows its own dedicated cycling status line (AIStatusIndicator.tsx)
   * instead — set true there so "thinking" doesn't appear twice. */
  hideTypingIndicator?: boolean;
  /** Starter suggestion grid, rendered inside the same empty-state block/ScrollView as the
   * greeting (rather than as a separate component below it) so the whole empty state is one
   * scrollable unit instead of two independently-sized pieces. Omit once there's a
   * conversation. */
  quickSuggestions?: {
    suggestions: QuickSuggestion[];
    onSelect: (label: string) => void;
  };
}

/**
 * The scrollable message list — empty-state greeting, bubbles, typing indicator, and
 * auto-scroll-to-bottom. Shared by app/chat.tsx (full-screen, mobile) and ChatPanel.tsx
 * (the Spotlight-style command-palette overlay, desktop/tablet) so the two surfaces
 * can't drift in behavior; only the surrounding chrome (header, input placement) differs.
 */
export function ChatConversation({
  userFirstName,
  avatarSize = 28,
  hideTypingIndicator = false,
  quickSuggestions,
}: ChatConversationProps) {
  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Fires after the new bubble/typing-indicator has actually laid out, not before.
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, isTyping]);

  return (
    <ScrollView ref={scrollRef} className="flex-1" contentContainerClassName="gap-3 py-4">
      {messages.length === 0 && !isTyping && (
        <View className="items-center gap-6 px-8 py-10">
          <View className="items-center">
            <AIAvatar size={avatarSize * 2} />
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
        <ChatBubble key={message.id} message={message} />
      ))}

      {isTyping && !hideTypingIndicator && (
        <View className="flex-row items-end gap-2 px-4">
          <AIAvatar size={avatarSize} pulse={false} />
          <View className="rounded-2xl rounded-bl-sm bg-elevated px-4 py-3">
            <TypingIndicator />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';

import { useThemeStore } from '../../store/themeStore';
import { useChatStore } from '../../store/chatStore';
import type { QuickSuggestion } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { getGreeting } from '../../utils/greeting';
import { colors } from '../../utils/theme';
import { Text } from '../ui';
import { AIAvatar } from './AIAvatar';
import { ChatBubble } from './ChatBubble';
import { QuickSuggestions } from './QuickSuggestions';
import { SmartSuggestions } from './SmartSuggestions';
import { TypingIndicator } from './TypingIndicator';

/** Reading-width cap for the conversation column on wide screens (shared with the composer
 * in app/chat.tsx so both line up). */
export const CHAT_COLUMN_MAX_WIDTH = 780;

/** "Good evening, Ana" — or "Still up, Ana?" for the late-night greeting that's a question. */
function greetingFor(name?: string): string {
  const greeting = getGreeting();
  if (!name) return greeting;
  return greeting.endsWith('?') ? `${greeting.slice(0, -1)}, ${name}?` : `${greeting}, ${name}`;
}

export interface ChatConversationProps {
  userFirstName?: string;
  /** Starter suggestion grid, rendered inside the empty-state hero. Omit once there's a conversation. */
  quickSuggestions?: {
    suggestions: QuickSuggestion[];
    onSelect: (label: string) => void;
  };
  /** Context-aware follow-up chips under the latest AI reply — the caller decides visibility. */
  onSelectSuggestion: (label: string) => void;
  showSmartSuggestions: boolean;
}

/**
 * The scrollable message list — empty-state hero, messages, typing indicator, smart
 * suggestions, and auto-scroll-to-bottom. Content sits in a centered, reading-width column
 * on desktop and goes full-width on phone.
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
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const scrollRef = useRef<ScrollView>(null);

  // Message ids already present when this screen mounted (restored from persisted history)
  // never animate in — only ones that arrive live in this session do.
  const sessionStartIds = useRef<Set<string> | null>(null);
  if (sessionStartIds.current === null) {
    sessionStartIds.current = new Set(messages.map((m) => m.id));
  }

  useEffect(() => {
    // Fires after the new message/typing indicator has actually laid out, not before.
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages.length, isTyping, isStreaming]);

  const lastMessage = messages[messages.length - 1];
  const lastMessageIsAssistant = lastMessage?.role === 'assistant';
  const isEmpty = messages.length === 0 && !isTyping;

  return (
    <View className="flex-1">
      {isEmpty && (
        // Soft aurora glow behind the hero — decorative only, never intercepts touches.
        <LinearGradient
          colors={[hexToRgba(colors.brand.tideTeal, isDark ? 0.12 : 0.08), hexToRgba('#6366F1', isDark ? 0.05 : 0.03), 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
          pointerEvents="none"
        />
      )}

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          width: '100%',
          maxWidth: CHAT_COLUMN_MAX_WIDTH,
          alignSelf: 'center',
          flexGrow: 1,
          justifyContent: isEmpty ? 'center' : 'flex-start',
          gap: 22,
          paddingVertical: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty && (
          <View className="items-center gap-8 px-5 py-6 md:px-6">
            <View className="items-center">
              <AIAvatar size={60} pulse shape="squircle" />
              <Text variant="h2" color="primary" className="mt-6 text-center">
                {greetingFor(userFirstName)}
              </Text>
              <Text variant="body" color="muted" className="mt-2 max-w-[420px] text-center leading-[22px]">
                I'm your TIDE Coach. Ask about your week, focus time, tasks, or mood — or let me plan your day.
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
          <View className="flex-row items-center gap-3 px-4 md:px-6">
            <AIAvatar size={28} pulse />
            <View className="rounded-full border border-subtle bg-surface px-4 py-3">
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

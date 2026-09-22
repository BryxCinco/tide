import { useEffect, useRef, useState } from 'react';
import {
  Modal as RNModal,
  Platform,
  Pressable,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useChatStore } from '../../store/chatStore';
import { useUiStore } from '../../store/uiStore';
import { shadows } from '../../utils/theme';
import { Icon, Text } from '../ui';
import { AIStatusIndicator } from './AIStatusIndicator';
import { ChatConversation } from './ChatConversation';
import { DEFAULT_QUICK_SUGGESTIONS, QuickSuggestions } from './QuickSuggestions';

const ANIM_DURATION = 220;

/**
 * The AI Coach as a minimalist command-palette overlay — Spotlight/Raycast-style, not
 * the side-peek panel this used to be, and (as of this revision) the ONLY chat UI at any
 * screen width — there is no more separate isPhone branch that falls back to a different
 * design. That branch used to exist and was the actual bug behind "the design didn't
 * change": on anything under desktop width, the FAB silently routed to the old untouched
 * app/chat.tsx instead of opening this. Structurally mirrors SearchModal.tsx (RNModal,
 * dimmed+blurred backdrop, tap-outside/Esc to close), because the point is the opposite
 * of the old side panel's "stay interactive while browsing" goal: a focused,
 * distraction-free surface with everything behind it dimmed. Centered on tablet/desktop
 * ("directly in the middle of the screen"); top-anchored on phone instead of dead-center,
 * same reasoning as SearchModal — a truly centered modal fights with the software
 * keyboard sliding up from the bottom.
 *
 * Input lives at the TOP (not a bottom bar) — the Raycast/Spotlight convention of a
 * single dominant input with results/output growing below it, rather than a
 * conventional bottom-anchored chat compose bar.
 */
export function ChatPanel() {
  const { isPhone } = useResponsive();
  const { user } = useAuth();
  const themeColors = useThemeColors();
  const closeChat = useUiStore((s) => s.closeChat);
  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearChat = useChatStore((s) => s.clearChat);

  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) });
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimeout);
    // Runs once per mount — the parent only renders this while isChatOpen is true (see
    // app/_layout.tsx), so "mounted" and "should be open" are the same event here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.97 + progress.value * 0.03 }],
  }));

  const handleSend = (text: string) => {
    const content = text.trim();
    if (!content) return;
    setDraft('');
    sendMessage(content, user?.name);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') handleSend(draft);
    if (e.nativeEvent.key === 'Escape') closeChat();
  };

  return (
    <RNModal visible transparent animationType="none" onRequestClose={closeChat} statusBarTranslucent>
      <View className={isPhone ? 'flex-1 pt-20' : 'flex-1 items-center justify-center'}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 14, 20, 0.6)' },
            Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as const) : undefined,
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={closeChat} />
        </Animated.View>

        <Animated.View
          style={contentStyle}
          className={isPhone ? 'mx-4' : 'mx-4 w-full md:max-w-[640px]'}
          pointerEvents="box-none"
        >
          <View className="overflow-hidden rounded-2xl border border-glass bg-elevated" style={shadows.lg}>
            <View className="flex-row items-center gap-3 px-5" style={{ height: 64 }}>
              <Icon name="Sparkles" size={22} color={themeColors.brand.tideTeal} />
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                onKeyPress={handleKeyPress}
                placeholder="Ask your AI Coach anything..."
                placeholderTextColor={themeColors.text.disabled}
                className="flex-1 font-sans text-primary"
                style={{ fontSize: 20 }}
              />
              {messages.length > 0 && (
                <Pressable onPress={clearChat} hitSlop={8}>
                  <Icon name="Trash2" size={18} color={themeColors.text.muted} />
                </Pressable>
              )}
              <Pressable onPress={closeChat} hitSlop={8}>
                <Icon name="X" size={20} color={themeColors.text.primary} />
              </Pressable>
            </View>

            <View className="border-t border-subtle">
              <AIStatusIndicator visible={isTyping} />

              {messages.length === 0 && !isTyping && (
                <QuickSuggestions suggestions={DEFAULT_QUICK_SUGGESTIONS} onSelect={handleSend} />
              )}

              {(messages.length > 0 || isTyping) && (
                <View style={{ maxHeight: isPhone ? 320 : 420 }}>
                  <ChatConversation userFirstName={user?.name?.trim().split(/\s+/)[0]} avatarSize={24} hideTypingIndicator />
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Modal as RNModal,
  Platform,
  Pressable,
  View,
  type NativeSyntheticEvent,
  type TextInput as RNTextInputHandle,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { TextInput } from '../ui/SoundTextInput';

import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useChatStore } from '../../store/chatStore';
import { useThemeStore } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { gradients } from '../../utils/gradients';
import { soundManager } from '../../utils/soundManager';
import { modalHover, modalSurface, shadows } from '../../utils/theme';
import { darkVars, lightVars } from '../../utils/themeVars';
import { Icon, Text, type IconName } from '../ui';
import { AIStatusIndicator } from './AIStatusIndicator';
import { ChatConversation } from './ChatConversation';
import { DEFAULT_QUICK_SUGGESTIONS } from './QuickSuggestions';

/** Same circular, subtle-bg, hover-teal, press-squash treatment as Modal.tsx's close
 * button — used here for both the clear-chat and close actions so this panel's header
 * chrome matches the rest of the app's dialogs instead of being bare icons. */
function HeaderIconButton({
  icon,
  onPress,
  themeColors,
  isDark,
}: {
  icon: IconName;
  onPress: () => void;
  themeColors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={() => {
        soundManager.play('tap');
        onPress();
      }}
      hitSlop={8}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="h-9 w-9 items-center justify-center rounded-full"
      style={({ pressed }) => [
        { backgroundColor: hovered ? 'rgba(20, 184, 166, 0.12)' : isDark ? modalHover.dark : modalHover.light },
        pressed && { transform: [{ scale: 0.88 }] },
      ]}
    >
      <Icon name={icon} size={17} color={hovered ? themeColors.brand.tideTeal : themeColors.text.secondary} />
    </Pressable>
  );
}

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
 * Composer lives in a bottom bar under the conversation, like a normal chat app (Messages/
 * Claude/ChatGPT), not the Raycast-style dominant top input this used to be — that read as
 * a command palette, not a conversation you type into while looking at what came before.
 * The conversation area itself is a fixed-height scrollable "page" (not one that grows/
 * shrinks with message count) so early replies don't visually jump as new ones arrive, and
 * message text is selectable so past answers can be copied.
 */
export function ChatPanel() {
  const { isPhone } = useResponsive();
  const { user } = useAuth();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const closeChat = useUiStore((s) => s.closeChat);
  const messages = useChatStore((s) => s.messages);
  const isTyping = useChatStore((s) => s.isTyping);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearChat = useChatStore((s) => s.clearChat);

  const [draft, setDraft] = useState('');
  const inputRef = useRef<RNTextInputHandle>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Same spring as Modal.tsx's entrance — a slight natural overshoot rather than a flat
    // ease-out, so this reads as the same family of "premium" dialog rather than a
    // leftover from before that pass.
    progress.value = withSpring(1, { damping: 16, stiffness: 180, mass: 0.9 });
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimeout);
    // Runs once per mount — the parent only renders this while isChatOpen is true (see
    // app/_layout.tsx), so "mounted" and "should be open" are the same event here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(progress.value, 1) }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1),
    transform: [{ scale: 0.94 + progress.value * 0.06 }],
  }));

  const handleSend = (text: string) => {
    const content = text.trim();
    if (!content) return;
    setDraft('');
    sendMessage(content, user?.name);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (e.nativeEvent.key === 'Enter') {
      soundManager.play('tap');
      handleSend(draft);
    }
    if (e.nativeEvent.key === 'Escape') closeChat();
  };

  return (
    <RNModal visible transparent animationType="none" onRequestClose={closeChat} statusBarTranslucent>
      {/* Re-establishes the theme's CSS custom properties inside this portaled subtree —
          see Modal.tsx's matching comment for why RNModal on web needs this at all. */}
      <View className={isPhone ? 'flex-1 pt-20' : 'flex-1 items-center justify-center'} style={isDark ? darkVars : lightVars}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            },
            Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as const) : undefined,
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={closeChat} />
        </Animated.View>

        <Animated.View
          style={contentStyle}
          className={isPhone ? 'mx-4' : 'mx-4 w-full md:max-w-[720px]'}
          pointerEvents="box-none"
        >
          {/* Solid, not `bg-elevated` + `border-glass` — same fix as Modal.tsx/SearchModal.tsx.
              Sized and chromed to match Modal.tsx's own upgrade (28px radius, icon badge,
              circular hover buttons, top accent line) so this reads as the same family of
              dialog instead of a leftover, smaller-scale design. */}
          <View
            className="overflow-hidden rounded-[28px]"
            style={[
              {
                backgroundColor: isDark ? modalSurface.dark : modalSurface.light,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              },
              shadows.modal,
            ]}
          >
            <View className="absolute left-0 right-0 top-0 h-[3px]" pointerEvents="none">
              <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </View>

            <View className="flex-row items-center gap-3.5 border-b border-subtle px-6" style={{ height: 68 }}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-tide-teal/[0.12]">
                <Icon name="Sparkles" size={19} color={themeColors.brand.tideTeal} />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-primary" style={{ fontSize: 16 }}>
                  AI Coach
                </Text>
              </View>
              {messages.length > 0 && <HeaderIconButton icon="Trash2" onPress={clearChat} themeColors={themeColors} isDark={isDark} />}
              <HeaderIconButton icon="X" onPress={closeChat} themeColors={themeColors} isDark={isDark} />
            </View>

            {/* Fixed-height "page" — scrolls internally instead of the whole panel growing
                with message count, so it reads as a stable conversation surface. The
                starter suggestion grid renders inside ChatConversation's own empty state
                (one ScrollView) rather than as a sibling here. */}
            <View style={{ height: isPhone ? 420 : 480 }}>
              <ChatConversation
                userFirstName={user?.name?.trim().split(/\s+/)[0]}
                avatarSize={24}
                hideTypingIndicator
                quickSuggestions={messages.length === 0 ? { suggestions: DEFAULT_QUICK_SUGGESTIONS, onSelect: handleSend } : undefined}
              />
              <AIStatusIndicator visible={isTyping} />
            </View>

            {/* Bottom compose bar — a normal chat input under the conversation, not the
                dominant top input this panel used to open with. */}
            <View className="flex-row items-center gap-2.5 border-t border-subtle px-4 py-3">
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                onKeyPress={handleKeyPress}
                placeholder="Message your AI Coach..."
                placeholderTextColor={themeColors.text.disabled}
                className="flex-1 rounded-full bg-base px-4 font-sans text-primary"
                style={{ fontSize: 15, height: 42 }}
              />
              <Pressable
                onPress={() => {
                  soundManager.play('tap');
                  handleSend(draft);
                }}
                disabled={!draft.trim()}
                hitSlop={8}
                className="h-10 w-10 items-center justify-center rounded-full bg-tide-teal"
                style={({ pressed }) => [
                  !draft.trim() && { opacity: 0.4 },
                  pressed && draft.trim() ? { transform: [{ scale: 0.92 }] } : undefined,
                ]}
              >
                <Icon name="ArrowUp" size={19} color={themeColors.text.inverse} />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

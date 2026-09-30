import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type NativeSyntheticEvent,
  type TextInput as RNTextInputHandle,
  type TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ChatConversation, ChatHeader, DEFAULT_QUICK_SUGGESTIONS } from '@/components/chat';
import { AppLayout } from '@/components/layout';
import { Icon, Skeleton } from '@/components/ui';
import { Pressable } from '@/components/ui/SoundPressable';
import { TextInput } from '@/components/ui/SoundTextInput';
import { useAuth } from '@/hooks/useAuth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useChatStore } from '@/store/chatStore';
import { showToast } from '@/store/toastStore';
import { soundManager } from '@/utils/soundManager';

const MIN_COMPOSER_HEIGHT = 44;
const MAX_COMPOSER_HEIGHT = 130; // ~5 lines at this font size, per Fix 5's "auto-grow up to 5 lines".
// Mirrors server/routes/chat.js's MAX_MESSAGE_LENGTH — stops a pasted essay before it's even
// sent, rather than silently truncating it after the fact server-side.
const MAX_MESSAGE_LENGTH = 2000;

interface SendButtonProps {
  disabled: boolean;
  onPress: () => void;
}

/** Scale 0.95 on press, 1.05 on hover (web) — Fix 6. Android gets a real ripple via
 * `android_ripple`; iOS/web don't have a native ripple concept, so the hover/press scale IS
 * the click feedback there, matching the spec's own web/mobile split. */
function SendButton({ disabled, onPress }: SendButtonProps) {
  const themeColors = useThemeColors();
  const isHovered = useRef(false);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const settle = () => {
    scale.value = withSpring(isHovered.current ? 1.05 : 1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          soundManager.play('tap');
          onPress();
        }}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
        }}
        onPressOut={() => !disabled && settle()}
        onHoverIn={() => {
          if (disabled) return;
          isHovered.current = true;
          scale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
        }}
        onHoverOut={() => {
          isHovered.current = false;
          if (!disabled) settle();
        }}
        disabled={disabled}
        hitSlop={8}
        android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: true, radius: 22 }}
        className="h-11 w-11 items-center justify-center rounded-full bg-tide-teal"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <Icon name="ArrowUp" size={20} color={themeColors.text.inverse} />
      </Pressable>
    </Animated.View>
  );
}

/** Shown for the brief window before persisted chat history finishes loading from storage
 * (chatStore's hasHydrated) — a couple of alternating-side bubble placeholders rather than
 * the real empty state, so a returning user with history doesn't see a flash of "Hey!" before
 * their actual messages pop in. */
function ChatSkeleton() {
  return (
    <View className="flex-1 justify-end gap-3 px-4 py-4">
      <View className="max-w-[70%] self-start">
        <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-sm" />
      </View>
      <View className="max-w-[70%] self-end">
        <Skeleton className="h-9 w-36 rounded-2xl rounded-br-sm" />
      </View>
      <View className="max-w-[70%] self-start">
        <Skeleton className="h-14 w-56 rounded-2xl rounded-bl-sm" />
      </View>
    </View>
  );
}

/**
 * Full-page AI Coach (Fix 5) — replaces the old ChatPanel.tsx modal/overlay entirely.
 * Reached via the sidebar's "AI Coach" NavItem (plain href, unchanged) and ChatbotFAB
 * (now navigates here instead of opening the retired overlay).
 */
export default function ChatScreen() {
  const { user } = useAuth();
  const themeColors = useThemeColors();
  const messages = useChatStore((s) => s.messages);
  const hasHydrated = useChatStore((s) => s.hasHydrated);
  const isTyping = useChatStore((s) => s.isTyping);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearChat = useChatStore((s) => s.clearChat);

  const [draft, setDraft] = useState('');
  const [composerHeight, setComposerHeight] = useState(MIN_COMPOSER_HEIGHT);
  const inputRef = useRef<RNTextInputHandle>(null);

  useEffect(() => {
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(focusTimeout);
  }, []);

  const handleSend = (text: string) => {
    const content = text.trim();
    // Mirrors chatStore.sendMessage's own guard — checked here too so a busy Enter-press
    // doesn't clear the user's draft for a message that the store is about to silently
    // reject anyway.
    if (!content || isTyping || isStreaming) return;
    setDraft('');
    setComposerHeight(MIN_COMPOSER_HEIGHT);
    sendMessage(content, user?.name);
  };

  // Enter sends (Shift+Enter inserts a newline) — a physical-keyboard convenience for web;
  // native platforms just use the send button, since a touch keyboard's return key inserting
  // a newline in a multiline field is the expected behavior there.
  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS !== 'web') return;
    const native = e.nativeEvent as TextInputKeyPressEventData & { shiftKey?: boolean; preventDefault?: () => void };
    if (native.key === 'Enter' && !native.shiftKey) {
      native.preventDefault?.();
      soundManager.play('tap');
      handleSend(draft);
    }
  };

  const handleVoicePress = () => {
    showToast('Voice input is coming soon.', 'info');
  };

  // Smart suggestions (Fix 7): only once there's a reply to react to, never while one is
  // still being generated/revealed, and auto-hidden the moment the user starts a new draft.
  const showSmartSuggestions = draft.trim() === '' && !isTyping && !isStreaming && messages.length > 0;

  return (
    <AppLayout showMobileMenuButton={false}>
      <SafeAreaView className="flex-1 bg-base" edges={['top', 'bottom']}>
        <ChatHeader isTyping={isTyping} hasMessages={messages.length > 0} onClear={clearChat} />

        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {!hasHydrated ? (
            <ChatSkeleton />
          ) : (
            <ChatConversation
              userFirstName={user?.name?.trim().split(/\s+/)[0]}
              quickSuggestions={
                messages.length === 0 ? { suggestions: DEFAULT_QUICK_SUGGESTIONS, onSelect: handleSend } : undefined
              }
              showSmartSuggestions={showSmartSuggestions}
              onSelectSuggestion={handleSend}
            />
          )}

          <View className="flex-row items-end gap-2 border-t border-subtle px-4 py-3">
            <Pressable
              onPress={handleVoicePress}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full hover:bg-elevated"
            >
              <Icon name="Mic" size={19} color={themeColors.text.secondary} />
            </Pressable>

            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              onKeyPress={handleKeyPress}
              onContentSizeChange={(e) => {
                const next = Math.min(
                  Math.max(MIN_COMPOSER_HEIGHT, e.nativeEvent.contentSize.height + 12),
                  MAX_COMPOSER_HEIGHT,
                );
                setComposerHeight(next);
              }}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Message your AI Coach..."
              placeholderTextColor={themeColors.text.disabled}
              className="flex-1 rounded-2xl bg-base px-4 py-2.5 font-sans text-primary"
              style={{ fontSize: 15, height: composerHeight, maxHeight: MAX_COMPOSER_HEIGHT }}
            />

            <SendButton disabled={!draft.trim() || isTyping || isStreaming} onPress={() => handleSend(draft)} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppLayout>
  );
}

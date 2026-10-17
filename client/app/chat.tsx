import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  type NativeSyntheticEvent,
  type TextInput as RNTextInputHandle,
  type TextInputKeyPressEventData,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { CHAT_COLUMN_MAX_WIDTH, ChatConversation, ChatHeader, DEFAULT_QUICK_SUGGESTIONS } from '@/components/chat';
import { AppLayout, MobileTabBar } from '@/components/layout';
import { Icon, Skeleton, Text } from '@/components/ui';
import { Pressable } from '@/components/ui/SoundPressable';
import { TextInput } from '@/components/ui/SoundTextInput';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useChatStore } from '@/store/chatStore';
import { showToast } from '@/store/toastStore';
import { gradientDirections, gradients } from '@/utils/gradients';
import { soundManager } from '@/utils/soundManager';

const MIN_COMPOSER_HEIGHT = 40;
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
        android_ripple={{ color: 'rgba(255,255,255,0.35)', borderless: true, radius: 20 }}
        className="h-10 w-10 items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: themeColors.background.hover }}
      >
        {!disabled && (
          <LinearGradient
            colors={[...gradients.aurora]}
            {...gradientDirections.diagonal}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
        )}
        <View>
          <Icon name="ArrowUp" size={19} strokeWidth={2.4} color={disabled ? themeColors.text.disabled : '#FFFFFF'} />
        </View>
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
    <View className="w-full flex-1 justify-end gap-4 self-center px-4 py-6" style={{ maxWidth: CHAT_COLUMN_MAX_WIDTH }}>
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
  const { isPhone } = useResponsive();
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
    // 50ms used to be enough to just get the TextInput mounted, but on iOS it can also beat
    // KeyboardAvoidingView's own onLayout measurement of its frame — if the keyboard opens
    // (from this focus) before that frame is captured, KAV computes 0px of compensating
    // padding and the composer renders hidden under the keyboard instead of above it. 400ms
    // gives the screen's own mount/layout pass (plus any navigation transition) room to
    // settle first — not a hard guarantee, but far outside the near-certain-to-lose-the-race
    // window 50ms was.
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 400);
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
      {/* bottom excluded — MobileTabBar (below) owns the bottom safe-area inset itself,
          so the two don't double up on phone. */}
      <SafeAreaView className="flex-1 bg-base" edges={['top']}>
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

          {/* Floating composer card, centered on the same reading column as the messages. */}
          <View className="w-full self-center px-3 pb-3 pt-1 md:px-6 md:pb-5" style={{ maxWidth: CHAT_COLUMN_MAX_WIDTH + 48 }}>
            <View
              className="flex-row items-end gap-1.5 rounded-[26px] border border-default bg-surface p-1.5"
              style={{
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.06,
                shadowRadius: 24,
                elevation: 3,
              }}
            >
              <Pressable
                onPress={handleVoicePress}
                hitSlop={6}
                accessibilityLabel="Voice input"
                className="h-10 w-10 items-center justify-center rounded-full hover:bg-elevated"
              >
                <Icon name="Mic" size={18} color={themeColors.text.muted} />
              </Pressable>

              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={(text) => {
                  setDraft(text);
                  // Lets the web textarea shrink back when lines are deleted — its scrollHeight
                  // never reports less than the box's current height.
                  if (!text.includes('\n') && text.length < 30) setComposerHeight(MIN_COMPOSER_HEIGHT);
                }}
                onKeyPress={handleKeyPress}
                onContentSizeChange={(e) => {
                  // Web reports the textarea's scrollHeight, which already includes its own
                  // padding (and is never smaller than its current height) — adding padding
                  // again there made the box grow by 12px on every keystroke. Native reports
                  // just the text's height, so the vertical padding gets added back.
                  const contentHeight = e.nativeEvent.contentSize.height + (Platform.OS === 'web' ? 0 : 20);
                  setComposerHeight(Math.min(Math.max(MIN_COMPOSER_HEIGHT, contentHeight), MAX_COMPOSER_HEIGHT));
                }}
                multiline
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Ask your coach anything…"
                placeholderTextColor={themeColors.text.disabled}
                className="flex-1 px-1 py-2.5 font-sans text-primary"
                style={{ fontSize: 15, height: composerHeight, maxHeight: MAX_COMPOSER_HEIGHT }}
              />

              <SendButton disabled={!draft.trim() || isTyping || isStreaming} onPress={() => handleSend(draft)} />
            </View>
            {!isPhone && (
              <Text variant="body" color="muted" className="mt-2 text-center text-[11px]">
                Enter to send · Shift + Enter for a new line · TIDE Coach can make mistakes.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <MobileTabBar />
    </AppLayout>
  );
}

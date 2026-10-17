import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { ChatAction, ChatMessage } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, Text, type IconName } from '../ui';
import { AIAvatar } from './AIAvatar';

/** The "View in Tasks"-style chip(s) a reply can carry when the AI actually did something —
 * a one-line summary of what happened plus a button straight to the relevant screen, so the
 * user doesn't have to go find it themselves. */
function ChatActionCard({ action }: { action: ChatAction }) {
  const themeColors = useThemeColors();

  return (
    <Pressable
      onPress={() => router.push(action.route as never)}
      className="mt-1.5 flex-row items-center gap-2.5 self-stretch rounded-xl border border-subtle bg-base px-3 py-2.5 hover:border-tide-teal/40"
    >
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: hexToRgba(themeColors.brand.tideTeal, 0.12) }}
      >
        <Icon name={(action.icon as IconName) ?? 'Sparkles'} size={15} color={themeColors.brand.tideTeal} />
      </View>
      <View className="flex-1">
        {action.summary && (
          <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={2}>
            {action.summary}
          </Text>
        )}
        <Text variant="body" className="font-semibold text-tide-teal" numberOfLines={1}>
          {action.label}
        </Text>
      </View>
      <Icon name="ChevronRight" size={16} color={themeColors.brand.tideTeal} />
    </Pressable>
  );
}

export interface ChatBubbleProps {
  message: ChatMessage;
  /** True only for the one assistant message currently being revealed (chatStore's
   * revealMessage) — shows the blinking cursor at the end of its text (Fix 6). */
  isStreamingCursor?: boolean;
  /** True for a message created live during this session (not restored from persisted
   * history) — triggers the avatar's one-shot spin-in (Fix 6). */
  isNewMessage?: boolean;
}

// Fade in + slide up 20px, 300ms ease-out (Fix 6, spec'd exactly) — a custom Reanimated
// `entering` worklet rather than a built-in preset (FadeInUp etc.) so the offset and
// duration match those numbers precisely instead of whatever a preset's defaults happen to be.
const bubbleEntering: EntryExitAnimationFunction = () => {
  'worklet';
  const config = { duration: 300, easing: Easing.out(Easing.ease) };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 20 }] },
    animations: {
      opacity: withTiming(1, config),
      transform: [{ translateY: withTiming(0, config) }],
    },
  };
};

/** Blinking teal bar at the end of streaming text — toggles every 500ms (Fix 6). */
function StreamingCursor() {
  const opacity = useSharedValue(1);

  // Runs once on mount, not on every re-render — the parent bubble re-renders on every
  // word revealed (chatStore's revealMessage), which would otherwise restart this loop
  // dozens of times a second and make it look frozen instead of blinking.
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0, { duration: 500, easing: Easing.linear }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width: 2, height: 15, marginLeft: 2, backgroundColor: colors.brand.tideTeal }, style]} />;
}

/** ChatGPT/Claude-style bubble — user right-aligned teal, assistant left-aligned
 * bg-elevated with the AI avatar. The "tail" corner (rounded-br-sm / rounded-bl-sm) is
 * the one visual cue distinguishing sender at a glance without re-reading alignment. */
export function ChatBubble({ message, isStreamingCursor, isNewMessage }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={bubbleEntering}
      className={cn('flex-row items-end gap-2 px-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && <AIAvatar size={28} pulse={false} spinOnMount={isNewMessage} />}
      <View className={cn('max-w-[78%] md:max-w-[65%]', isUser ? 'items-end' : 'items-start')}>
        <View
          className={cn(
            'flex-row flex-wrap items-end rounded-2xl px-4 py-2.5',
            isUser ? 'rounded-br-sm bg-tide-teal' : 'rounded-bl-sm bg-elevated',
          )}
        >
          <Text variant="body" color={isUser ? 'inverse' : 'primary'} selectable>
            {message.content}
          </Text>
          {isStreamingCursor && <StreamingCursor />}
        </View>

        {message.actions?.map((action, index) => (
          <Animated.View key={`${action.route}-${index}`} entering={FadeIn.delay(100 + index * 80).duration(300)}>
            <ChatActionCard action={action} />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

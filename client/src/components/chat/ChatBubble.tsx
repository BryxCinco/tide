import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';

import type { ChatMessage } from '../../types/chat';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Text } from '../ui';
import { AIAvatar } from './AIAvatar';

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
      <View
        className={cn(
          'max-w-[78%] flex-row flex-wrap items-end rounded-2xl px-4 py-2.5 md:max-w-[65%]',
          isUser ? 'rounded-br-sm bg-tide-teal' : 'rounded-bl-sm bg-elevated',
        )}
      >
        <Text variant="body" color={isUser ? 'inverse' : 'primary'} selectable>
          {message.content}
        </Text>
        {isStreamingCursor && <StreamingCursor />}
      </View>
    </Animated.View>
  );
}

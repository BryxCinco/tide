import { LinearGradient } from 'expo-linear-gradient';
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
import { gradientDirections } from '../../utils/gradients';
import { colors } from '../../utils/theme';
import { Icon, Text, type IconName } from '../ui';
import { AIAvatar } from './AIAvatar';

/** The "View in Tasks"-style card(s) a reply can carry when the AI actually did something —
 * a one-line summary of what happened plus a button straight to the relevant screen. */
function ChatActionCard({ action }: { action: ChatAction }) {
  const themeColors = useThemeColors();
  const teal = themeColors.brand.tideTeal;

  return (
    <Pressable
      onPress={() => router.push(action.route as never)}
      className="mt-2 flex-row items-center gap-3 self-stretch rounded-2xl border border-subtle bg-surface px-3 py-2.5 transition-colors hover:border-tide-teal/40"
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(teal, 0.12) }}>
        <Icon name={(action.icon as IconName) ?? 'Sparkles'} size={16} color={teal} />
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text variant="body" color="primary" className="text-[14px] font-semibold" numberOfLines={1}>
          {action.label}
        </Text>
        {action.summary && (
          <Text variant="body" color="muted" className="text-[12px]" numberOfLines={2}>
            {action.summary}
          </Text>
        )}
      </View>
      <Icon name="ArrowUpRight" size={16} color={themeColors.text.muted} />
    </Pressable>
  );
}

export interface ChatBubbleProps {
  message: ChatMessage;
  /** True only for the one assistant message currently being revealed (chatStore's
   * revealMessage) — shows the blinking cursor at the end of its text. */
  isStreamingCursor?: boolean;
  /** True for a message created live during this session (not restored from persisted
   * history) — only these get the entrance fade, so opening the screen doesn't animate the
   * whole history at once. */
  isNewMessage?: boolean;
}

// Short fade + 8px rise. Deliberately small: big slide distances on every message are what
// make a chat feel like it's jumping around.
const bubbleEntering: EntryExitAnimationFunction = () => {
  'worklet';
  const config = { duration: 240, easing: Easing.out(Easing.cubic) };
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 8 }] },
    animations: {
      opacity: withTiming(1, config),
      transform: [{ translateY: withTiming(0, config) }],
    },
  };
};

/** Blinking teal bar at the end of streaming text. */
function StreamingCursor() {
  const opacity = useSharedValue(1);

  // Runs once on mount — the parent re-renders on every revealed word, which would otherwise
  // restart this loop constantly and make it look frozen instead of blinking.
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0, { duration: 500, easing: Easing.linear }), -1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width: 2, height: 16, marginLeft: 2, borderRadius: 1, backgroundColor: colors.brand.tideTeal }, style]} />;
}

/**
 * User messages are a compact gradient bubble on the right; assistant replies are open text
 * beside the AI avatar (no bubble), which keeps long answers easy to read instead of boxing
 * them into a narrow card.
 */
export function ChatBubble({ message, isStreamingCursor, isNewMessage }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const entering = isNewMessage ? bubbleEntering : undefined;

  if (isUser) {
    return (
      <Animated.View entering={entering} className="flex-row justify-end px-4 md:px-6">
        <View className="max-w-[82%] overflow-hidden rounded-[20px] rounded-br-md md:max-w-[70%]">
          <LinearGradient
            colors={['#0D9488', '#0891B2']}
            {...gradientDirections.diagonal}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <Text variant="body" color="inverse" className="px-4 py-2.5 leading-[22px]" selectable>
            {message.content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entering} className="flex-row items-start gap-3 px-4 md:px-6">
      <View className="pt-0.5">
        <AIAvatar size={28} />
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text variant="body" color="primary" className="mb-1 text-[13px] font-semibold">
          TIDE Coach
        </Text>
        <View className="flex-row flex-wrap items-end">
          <Text variant="body" color="secondary" className="leading-[23px]" selectable>
            {message.content}
          </Text>
          {isStreamingCursor && <StreamingCursor />}
        </View>

        {message.actions?.map((action, index) => (
          <Animated.View key={`${action.route}-${index}`} entering={FadeIn.delay(100 + index * 80).duration(260)}>
            <ChatActionCard action={action} />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

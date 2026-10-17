import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { ChatAction, ChatMessage } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { formatTime } from '../../utils/formatDate';
import { gradientDirections, gradients } from '../../utils/gradients';
import { colors } from '../../utils/theme';
import { FadeInView, Icon, Text, type IconName } from '../ui';
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
 * User messages: a compact aurora bubble on the right. Assistant replies: a card on the left
 * with a thin aurora rail down its edge and a small "TIDE Coach · time" header — readable for
 * long answers, and unmistakably the coach at a glance. Only messages created in this session
 * fade in; restored history appears instantly.
 */
export function ChatBubble({ message, isStreamingCursor, isNewMessage }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const time = message.timestamp ? formatTime(message.timestamp) : '';

  if (isUser) {
    return (
      <FadeInView animate={Boolean(isNewMessage)} className="px-4 md:px-6">
        <View className="items-end">
          <View className="max-w-[82%] overflow-hidden rounded-[20px] rounded-br-md md:max-w-[70%]">
            <LinearGradient
              colors={[...gradients.aurora]}
              {...gradientDirections.diagonal}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            />
            <Text variant="body" color="inverse" className="px-4 py-2.5 leading-[22px]" selectable>
              {message.content}
            </Text>
          </View>
          {time ? (
            <Text variant="body" color="muted" className="mr-1 mt-1 text-[11px]">
              {time}
            </Text>
          ) : null}
        </View>
      </FadeInView>
    );
  }

  return (
    <FadeInView animate={Boolean(isNewMessage)} className="px-4 md:px-6">
      <View className="flex-row items-center gap-2">
        <AIAvatar size={24} />
        <Text variant="body" color="primary" className="text-[13px] font-semibold">
          TIDE Coach
        </Text>
        {time ? (
          <Text variant="body" color="muted" className="text-[11px]">
            · {time}
          </Text>
        ) : null}
      </View>

      <View className="ml-3 mt-2 max-w-[92%] flex-row overflow-hidden rounded-[20px] rounded-tl-md border border-subtle bg-surface md:max-w-[85%]">
        <LinearGradient colors={[...gradients.aurora]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: 3 }} />
        <View className="flex-1 px-4 py-3" style={{ minWidth: 0 }}>
          <View className="flex-row flex-wrap items-end">
            <Text variant="body" color="secondary" className="leading-[23px]" selectable>
              {message.content}
            </Text>
            {isStreamingCursor && <StreamingCursor />}
          </View>

          {message.actions?.map((action, index) => (
            <FadeInView key={`${action.route}-${index}`} index={index + 2}>
              <ChatActionCard action={action} />
            </FadeInView>
          ))}
        </View>
      </View>
    </FadeInView>
  );
}

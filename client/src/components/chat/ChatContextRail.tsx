import { ScrollView, View } from 'react-native';

import type { QuickSuggestion } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { BENTO_INK_TEXT, BentoHeader, BentoTile, Icon, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { useTodaySnapshot } from './ChatWelcome';

export interface ChatContextRailProps {
  suggestions: QuickSuggestion[];
  onSelect: (label: string) => void;
  messageCount: number;
  onNewChat: () => void;
  /** Disables the prompt buttons while a reply is in flight. */
  busy: boolean;
}

const PROMPT_COLORS = ['#14B8A6', '#6366F1', '#F59E0B', '#EC4899'];

/**
 * Desktop-only side panel beside an active conversation: the same "what I see today"
 * snapshot the coach answers from, a few one-tap follow-up prompts, and this chat's
 * length with a New chat action — so the context never scrolls away with the messages.
 */
export function ChatContextRail({ suggestions, onSelect, messageCount, onNewChat, busy }: ChatContextRailProps) {
  const snapshot = useTodaySnapshot();

  return (
    // Fixed-width wrapper: a bare ScrollView in a row grows like flex-1 on web and would
    // take half the screen from the conversation.
    <View className="border-l border-subtle" style={{ width: 300, flexShrink: 0 }}>
      <ScrollView className="flex-1" contentContainerClassName="gap-3 p-4" showsVerticalScrollIndicator={false}>
        <BentoTile tone="ink" index={0}>
          <View className="gap-4">
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />
              <Text variant="label" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 1.4 }}>
                Coach can see
              </Text>
            </View>
            <View className="gap-3">
              {snapshot.map((item) => (
                <View key={item.label} className="flex-row items-center gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <Icon name={item.icon} size={15} color={item.color} />
                  </View>
                  <Text variant="body" className="flex-1 text-[13px]" style={{ color: BENTO_INK_TEXT.secondary }}>
                    {item.label}
                  </Text>
                  <Text variant="body" className="text-[14px] font-semibold" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </BentoTile>

        <BentoTile index={1}>
          <View className="gap-3">
            <BentoHeader title="Try asking" icon="Lightbulb" color="#F59E0B" />
            <View className="gap-2">
              {suggestions.slice(0, 4).map((suggestion, i) => {
                const color = PROMPT_COLORS[i % PROMPT_COLORS.length];
                return (
                  <Pressable
                    key={suggestion.id}
                    disabled={busy}
                    onPress={() => onSelect(suggestion.label)}
                    className="flex-row items-center gap-2.5 rounded-xl border border-subtle bg-base px-3 py-2.5 hover:border-tide-teal/40"
                    style={busy ? { opacity: 0.5 } : undefined}
                  >
                    <View className="h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: hexToRgba(color, 0.12) }}>
                      <Icon name={(suggestion.icon as IconName) ?? 'Sparkles'} size={14} color={color} />
                    </View>
                    <Text variant="body" color="secondary" className="flex-1 text-[13px] font-medium" numberOfLines={2}>
                      {suggestion.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BentoTile>

        <BentoTile index={2}>
          <View className="gap-3">
            <View>
              <Text variant="h3" color="primary" style={{ fontVariant: ['tabular-nums'] }}>
                {messageCount}
              </Text>
              <Text variant="body" color="muted" className="text-[12px]">
                messages in this chat
              </Text>
            </View>
            <Pressable
              onPress={onNewChat}
              accessibilityLabel="Start a new chat"
              className="h-9 flex-row items-center justify-center gap-1.5 rounded-xl border border-subtle bg-base px-3 hover:border-tide-teal/40"
            >
              <Icon name="SquarePen" size={14} />
              <Text variant="body" color="secondary" className="text-[13px] font-medium">
                New chat
              </Text>
            </Pressable>
          </View>
        </BentoTile>
      </ScrollView>
    </View>
  );
}

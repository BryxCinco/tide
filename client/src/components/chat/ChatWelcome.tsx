import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { useJournalStore } from '../../store/journalStore';
import { useDayStreak } from '../../store/streakStore';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import type { QuickSuggestion } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { gradientDirections, gradients } from '../../utils/gradients';
import { ocean } from '../../utils/theme';
import { getGreeting } from '../../utils/greeting';
import { BentoTile, FadeInView, Icon, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { AIAvatar } from './AIAvatar';

/** "Good evening, Ana" — or "Still up, Ana?" for the late-night greeting that's a question. */
function greetingFor(name?: string): string {
  const greeting = getGreeting();
  if (!name) return greeting;
  return greeting.endsWith('?') ? `${greeting.slice(0, -1)}, ${name}?` : `${greeting}, ${name}`;
}

const SUGGESTION_COLORS = [ocean.lagoon, ocean.surf, ocean.lavender, ocean.sand, '#F472B6', ocean.coral, ocean.aqua, ocean.seafoam];

export interface SnapshotItem {
  icon: IconName;
  /** Light tint — the snapshot is always shown on a dark `ink` tile. */
  color: string;
  value: string;
  label: string;
}

/** Today's focus time, open tasks, streak and journal count — the same data the coach
 * answers from. Shared by the welcome bento and the desktop context rail. */
export function useTodaySnapshot(): SnapshotItem[] {
  const activityTotals = useTimerStore((s) => s.activityTotals);
  const openTasks = useTaskStore((s) => s.tasks.filter((t) => t.status !== 'done').length);
  const streak = useDayStreak();
  const journalCount = useJournalStore((s) => s.entries.length);
  const focusSeconds = Object.values(activityTotals).reduce((sum, v) => sum + v, 0);

  return [
    { icon: 'Timer', color: ocean.seafoam, value: formatDuration(focusSeconds), label: 'focus today' },
    { icon: 'ListChecks', color: '#7DD3FC', value: `${openTasks}`, label: 'open tasks' },
    { icon: 'Flame', color: '#FDBA74', value: `${streak}`, label: 'day streak' },
    { icon: 'BookOpen', color: '#C4B5FD', value: `${journalCount}`, label: 'journal entries' },
  ];
}

export interface ChatWelcomeProps {
  userFirstName?: string;
  suggestions: QuickSuggestion[];
  onSelect: (label: string) => void;
}

/**
 * The AI Coach's empty state as a bento: who the coach is, a snapshot of what it can see
 * about today (the same data it answers from), and the starter prompts — the first one as
 * a large aurora tile, the rest as small colored tiles.
 */
export function ChatWelcome({ userFirstName, suggestions, onSelect }: ChatWelcomeProps) {
  const { isPhone } = useResponsive();
  const snapshot = useTodaySnapshot();

  const [featured, ...rest] = suggestions;
  const others = isPhone ? rest.slice(0, 4) : rest.slice(0, 6);

  return (
    <View className="gap-2.5 px-3 md:gap-3 md:px-6">
      {/* Focus-first: the greeting and what the coach can see sit in one tile — the context as
          small chips (not a second stats card repeating the Dashboard) — so the starter
          prompts and the chat stay the focus. */}
      <BentoTile tone="glass" dense index={0}>
        <View className="gap-3">
          <View className="flex-row items-center gap-3">
            <AIAvatar size={40} pulse shape="squircle" />
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text variant="h2" color="primary" className={isPhone ? 'text-[20px] leading-[25px]' : 'text-[24px] leading-[29px]'}>
                {greetingFor(userFirstName)}
              </Text>
              <Text variant="body" color="muted" className="text-[13px] leading-[19px]">
                I&apos;m your TIDE Coach — ask me anything, or let me plan your day. Here&apos;s what I can see:
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {snapshot.map((item) => (
              <View key={item.label} className="flex-row items-center gap-1.5 rounded-full border border-subtle px-2.5 py-1">
                <Icon name={item.icon} size={13} color={item.color} />
                <Text variant="body" color="primary" className="text-[12.5px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
                  {item.value}
                </Text>
                <Text variant="body" color="muted" className="text-[12px]">
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </BentoTile>

      <View className="flex-row flex-wrap gap-2.5 md:gap-3">
        {featured && (
          <FadeInView index={2} className="basis-full md:basis-[48%] md:grow">
            <Pressable
              onPress={() => onSelect(featured.label)}
              className="min-h-[92px] flex-1 justify-between overflow-hidden rounded-[20px] p-3.5"
            >
              <LinearGradient
                colors={[...gradients.ocean]}
                {...gradientDirections.diagonal}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              />
              <View className="flex-row items-center justify-between">
                <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                  <Icon name={(featured.icon as IconName) ?? 'Sparkles'} size={14} color="#FFFFFF" />
                </View>
                <View>
                  <Icon name="ArrowUpRight" size={16} color="#FFFFFF" />
                </View>
              </View>
              <Text variant="h3" className="text-[16px] leading-[21px]" style={{ color: '#FFFFFF' }}>
                {featured.label}
              </Text>
            </Pressable>
          </FadeInView>
        )}

        {others.map((suggestion, i) => {
          const color = SUGGESTION_COLORS[(i + 1) % SUGGESTION_COLORS.length];
          return (
            <BentoTile
              key={suggestion.id}
              tone="glass"
              dense
              index={i + 3}
              onPress={() => onSelect(suggestion.label)}
              accessibilityLabel={suggestion.label}
              className="basis-[46%] grow md:basis-[22%]"
            >
              <View className="min-h-[64px] flex-1 justify-between gap-2.5">
                <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: hexToRgba(color, 0.13) }}>
                  <Icon name={(suggestion.icon as IconName) ?? 'Sparkles'} size={14} color={color} />
                </View>
                <Text variant="body" color="primary" className="text-[13px] font-semibold leading-[17px]" numberOfLines={3}>
                  {suggestion.label}
                </Text>
              </View>
            </BentoTile>
          );
        })}
      </View>
    </View>
  );
}

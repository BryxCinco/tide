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
import { gradientDirections } from '../../utils/gradients';
import { ocean } from '../../utils/theme';
import { getGreeting } from '../../utils/greeting';
import { BENTO_INK_TEXT, BentoTile, FadeInView, Icon, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { AIAvatar } from './AIAvatar';

/** "Good evening, Ana" — or "Still up, Ana?" for the late-night greeting that's a question. */
function greetingFor(name?: string): string {
  const greeting = getGreeting();
  if (!name) return greeting;
  return greeting.endsWith('?') ? `${greeting.slice(0, -1)}, ${name}?` : `${greeting}, ${name}`;
}

const SUGGESTION_COLORS = [ocean.lagoon, ocean.surf, ocean.lavender, ocean.sand, '#F472B6', ocean.coral, ocean.aqua, ocean.seafoam];

// The featured prompt — lagoon into open water, a deeper take on the aurora.
const OCEAN_GRADIENT = [ocean.lagoon, '#0891B2', '#0E4F6B'] as const;

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
      <View className="gap-2.5 md:flex-row md:gap-3">
        <BentoTile tone="glass" dense index={0} className="md:flex-[1.4]">
          <View className="flex-1 justify-between gap-4">
            <AIAvatar size={40} pulse shape="squircle" />
            <View className="gap-1">
              <Text variant="h2" color="primary" className={isPhone ? 'text-[21px] leading-[26px]' : 'text-[26px] leading-[31px]'}>
                {greetingFor(userFirstName)}
              </Text>
              <Text variant="body" color="muted" className="text-[13px] leading-[19px]">
                I&apos;m your TIDE Coach. I can see your focus time, tasks, streak and journal — ask me anything, or let me
                plan your day.
              </Text>
            </View>
          </View>
        </BentoTile>

        <BentoTile tone="deep" dense index={1} className="md:flex-1">
          <View className="gap-3">
            <View className="flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ocean.seafoam }} />
              <Text variant="label" className="text-[10.5px]" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 0.8 }}>
                What I see today
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-y-3">
              {snapshot.map((item) => (
                <View key={item.label} className="basis-1/2 flex-row items-center gap-2">
                  <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    <Icon name={item.icon} size={14} color={item.color} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text variant="h3" className="text-[17px] leading-[21px]" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                      {item.value}
                    </Text>
                    <Text variant="body" className="text-[11px]" style={{ color: BENTO_INK_TEXT.muted }} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </BentoTile>
      </View>

      <View className="flex-row flex-wrap gap-2.5 md:gap-3">
        {featured && (
          <FadeInView index={2} className="basis-full md:basis-[48%] md:grow">
            <Pressable
              onPress={() => onSelect(featured.label)}
              className="min-h-[92px] flex-1 justify-between overflow-hidden rounded-[20px] p-3.5"
            >
              <LinearGradient
                colors={[...OCEAN_GRADIENT]}
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

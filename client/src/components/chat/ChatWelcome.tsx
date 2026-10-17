import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { useJournalStore } from '../../store/journalStore';
import { useQuestStore } from '../../store/questStore';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import type { QuickSuggestion } from '../../types/chat';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { gradientDirections, gradients } from '../../utils/gradients';
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

const SUGGESTION_COLORS = ['#14B8A6', '#0EA5E9', '#6366F1', '#F59E0B', '#EC4899', '#F97316', '#22C55E', '#8B5CF6'];

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
  const activityTotals = useTimerStore((s) => s.activityTotals);
  const openTasks = useTaskStore((s) => s.tasks.filter((t) => t.status !== 'done').length);
  const streak = useQuestStore((s) => s.streak);
  const journalCount = useJournalStore((s) => s.entries.length);
  const focusSeconds = Object.values(activityTotals).reduce((sum, v) => sum + v, 0);

  const snapshot: { icon: IconName; color: string; value: string; label: string }[] = [
    { icon: 'Timer', color: '#5EEAD4', value: formatDuration(focusSeconds), label: 'focus today' },
    { icon: 'ListChecks', color: '#7DD3FC', value: `${openTasks}`, label: 'open tasks' },
    { icon: 'Flame', color: '#FDBA74', value: `${streak}`, label: 'day streak' },
    { icon: 'BookOpen', color: '#C4B5FD', value: `${journalCount}`, label: 'journal entries' },
  ];

  const [featured, ...rest] = suggestions;
  const others = isPhone ? rest.slice(0, 4) : rest.slice(0, 6);

  return (
    <View className="gap-3 px-4 md:gap-4 md:px-6">
      <View className="gap-3 md:flex-row md:gap-4">
        <BentoTile tone="glow" index={0} className="md:flex-[1.4]">
          <View className="flex-1 justify-between gap-5">
            <AIAvatar size={52} pulse shape="squircle" />
            <View className="gap-1.5">
              <Text variant={isPhone ? 'h2' : 'h1'} color="primary">
                {greetingFor(userFirstName)}
              </Text>
              <Text variant="body" color="muted" className="leading-[22px]">
                I&apos;m your TIDE Coach. I can see your focus time, tasks, streak and journal — ask me anything, or let me
                plan your day.
              </Text>
            </View>
          </View>
        </BentoTile>

        <BentoTile tone="ink" index={1} className="md:flex-1">
          <View className="gap-4">
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />
              <Text variant="label" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 1.4 }}>
                What I see today
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-y-4">
              {snapshot.map((item) => (
                <View key={item.label} className="basis-1/2 gap-1.5">
                  <Icon name={item.icon} size={16} color={item.color} />
                  <View>
                    <Text variant="h3" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                      {item.value}
                    </Text>
                    <Text variant="body" className="text-[12px]" style={{ color: BENTO_INK_TEXT.muted }}>
                      {item.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </BentoTile>
      </View>

      <View className="flex-row flex-wrap gap-3 md:gap-4">
        {featured && (
          <FadeInView index={2} className="basis-full md:basis-[48%] md:grow">
            <Pressable
              onPress={() => onSelect(featured.label)}
              className="min-h-[124px] flex-1 justify-between overflow-hidden rounded-[22px] p-4"
            >
              <LinearGradient
                colors={[...gradients.aurora]}
                {...gradientDirections.diagonal}
                style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
              />
              <View className="flex-row items-center justify-between">
                <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Icon name={(featured.icon as IconName) ?? 'Sparkles'} size={17} color="#FFFFFF" />
                </View>
                <View>
                  <Icon name="ArrowUpRight" size={18} color="#FFFFFF" />
                </View>
              </View>
              <Text variant="h3" style={{ color: '#FFFFFF' }}>
                {featured.label}
              </Text>
            </Pressable>
          </FadeInView>
        )}

        {others.map((suggestion, i) => {
          const color = SUGGESTION_COLORS[(i + 1) % SUGGESTION_COLORS.length];
          return (
            <FadeInView key={suggestion.id} index={i + 3} className="basis-[46%] grow md:basis-[22%]">
              <Pressable
                onPress={() => onSelect(suggestion.label)}
                className="min-h-[124px] flex-1 justify-between gap-3 rounded-[22px] border border-subtle bg-surface p-4 hover:border-tide-teal/40"
              >
                <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(color, 0.12) }}>
                  <Icon name={(suggestion.icon as IconName) ?? 'Sparkles'} size={17} color={color} />
                </View>
                <Text variant="body" color="primary" className="text-[14px] font-semibold leading-[19px]" numberOfLines={3}>
                  {suggestion.label}
                </Text>
              </Pressable>
            </FadeInView>
          );
        })}
      </View>
    </View>
  );
}

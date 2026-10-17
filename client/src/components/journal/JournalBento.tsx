import { useMemo } from 'react';
import { View } from 'react-native';

import type { JournalEntry, Mood } from '../../types/journal';
import { MOOD_ORDER } from '../../types/journal';
import { BENTO_INK_TEXT, BentoTile, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { MOOD_ICON_MAP } from './MoodIcon';

const PROMPTS = [
  'What made today feel worth it?',
  'What drained your energy, and what gave it back?',
  'One small win you almost didn’t notice?',
  'What are you avoiding — and why?',
  'What would make tomorrow 1% better?',
  'Who helped you today, even a little?',
  'What did you learn that surprised you?',
  'Where did your focus actually go today?',
  'What are you grateful for right now?',
  'If today had a title, what would it be?',
];

/** Same prompt all day, a new one each day. */
function promptOfTheDay(date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return PROMPTS[dayOfYear % PROMPTS.length];
}

export function JournalPromptTile({ firstName, onWrite, className }: { firstName?: string; onWrite: () => void; className?: string }) {
  return (
    <BentoTile tone="aurora" index={0} className={className}>
      <View className="flex-1 justify-between gap-6">
        <View className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Icon name="Sparkles" size={13} color="#FFFFFF" />
          <Text variant="body" className="text-[12px] font-semibold" style={{ color: '#FFFFFF' }}>
            Prompt of the day
          </Text>
        </View>

        <View className="gap-2">
          {firstName && (
            <Text variant="body" className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Hey {firstName},
            </Text>
          )}
          <Text variant="h1" style={{ color: '#FFFFFF' }}>
            {promptOfTheDay()}
          </Text>
        </View>

        <Pressable
          onPress={onWrite}
          className="h-11 flex-row items-center gap-2 self-start rounded-full bg-white px-5"
        >
          <Icon name="PenLine" size={16} color="#0F766E" strokeWidth={2.3} />
          <Text variant="body" className="text-[14px] font-semibold" style={{ color: '#0F766E' }}>
            Start writing
          </Text>
        </Pressable>
      </View>
    </BentoTile>
  );
}

function isThisWeek(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  return date >= startOfWeek;
}

/** Dark tile: totals plus a five-bar mood breakdown across every entry. */
export function JournalStatsTile({ entries, onMoodPress, className }: { entries: JournalEntry[]; onMoodPress?: (mood: Mood) => void; className?: string }) {
  const stats = useMemo(() => {
    const counts: Record<Mood, number> = { terrible: 0, bad: 0, okay: 0, good: 0, great: 0 };
    let words = 0;
    for (const entry of entries) {
      if (entry.mood) counts[entry.mood] += 1;
      words += entry.wordCount ?? 0;
    }
    return {
      counts,
      maxCount: Math.max(1, ...Object.values(counts)),
      hasMoods: Object.values(counts).some((c) => c > 0),
      thisWeek: entries.filter((e) => isThisWeek(e.createdAt)).length,
      favorites: entries.filter((e) => e.isFavorite).length,
      words,
    };
  }, [entries]);

  const numbers = [
    { label: 'entries', value: entries.length },
    { label: 'this week', value: stats.thisWeek },
    { label: 'favorites', value: stats.favorites },
  ];

  return (
    <BentoTile tone="ink" index={1} className={className}>
      <View className="flex-1 justify-between gap-5">
        <View className="flex-row justify-between">
          {numbers.map((n) => (
            <View key={n.label}>
              <Text variant="h2" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
                {n.value}
              </Text>
              <Text variant="body" className="text-[12px] font-medium" style={{ color: BENTO_INK_TEXT.muted }}>
                {n.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="gap-2.5">
          <Text variant="label" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 1.4 }}>
            Mood mix
          </Text>
          {!stats.hasMoods ? (
            <Text variant="body" className="text-[13px] leading-[19px]" style={{ color: BENTO_INK_TEXT.secondary }}>
              Pick a mood when you write — your mix of good and rough days shows up here.
            </Text>
          ) : (
          <View className="h-20 flex-row items-end gap-2.5">
            {MOOD_ORDER.map((mood) => {
              const config = MOOD_ICON_MAP[mood];
              const count = stats.counts[mood];
              const height = Math.max(6, (count / stats.maxCount) * 52);
              return (
                <Pressable
                  key={mood}
                  onPress={onMoodPress ? () => onMoodPress(mood) : undefined}
                  accessibilityLabel={`${config.label}: ${count}`}
                  className="flex-1 items-center gap-1.5"
                >
                  <View style={{ height, width: '100%', borderRadius: 8, backgroundColor: count > 0 ? config.color : 'rgba(255,255,255,0.08)' }} />
                  <Icon name={config.icon} size={14} color={count > 0 ? config.color : BENTO_INK_TEXT.muted} />
                </Pressable>
              );
            })}
          </View>
          )}
        </View>

        <Text variant="body" className="text-[12px]" style={{ color: BENTO_INK_TEXT.muted }}>
          {stats.words.toLocaleString()} words written so far
        </Text>
      </View>
    </BentoTile>
  );
}

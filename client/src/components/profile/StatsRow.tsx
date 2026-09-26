import { useEffect } from 'react';
import { View } from 'react-native';

import { useJournalStore } from '../../store/journalStore';
import { useQuestStore } from '../../store/questStore';
import { useTimerStore } from '../../store/timerStore';
import { Icon, Text, type IconName } from '../ui';
import { colors } from '../../utils/theme';
import { formatDuration } from '../../utils/formatTime';

interface MiniStat {
  id: string;
  icon: IconName;
  value: string;
  label: string;
}

/**
 * 2x2 on phone, 4-across from tablet up — same breakpoint behavior as the Dashboard's
 * StatsRow, just a smaller/denser card since these four don't need trend lines or
 * count-up animation (Profile is a settings screen, not the Dashboard's hero surface).
 *
 * Focus Time / Sessions are TODAY's real numbers (timerStore), not an all-time total —
 * there's no all-time aggregate endpoint yet, and showing today's honest number beats
 * showing a fabricated lifetime one. Self-fetches on mount (via useTimerStore directly,
 * not the useTimer() hook — that hook also mounts the ticking interval, and mounting it a
 * second time here would double the timer's tick rate whenever Timer is open elsewhere).
 */
export function StatsRow() {
  const journalCount = useJournalStore((s) => s.entries.length);
  const streak = useQuestStore((s) => s.streak);
  const todaySessions = useTimerStore((s) => s.todaySessions);
  const activityTotals = useTimerStore((s) => s.activityTotals);
  const fetchTodaySessions = useTimerStore((s) => s.fetchTodaySessions);

  useEffect(() => {
    fetchTodaySessions();
  }, [fetchTodaySessions]);

  const todayTotalSeconds = Object.values(activityTotals).reduce((sum, value) => sum + value, 0);

  const stats: MiniStat[] = [
    { id: 'focus-time', icon: 'Timer', value: formatDuration(todayTotalSeconds), label: 'Focus Time Today' },
    { id: 'sessions', icon: 'Zap', value: String(todaySessions.length), label: 'Sessions Today' },
    { id: 'journal', icon: 'BookOpen', value: String(journalCount), label: 'Journal Entries' },
    { id: 'streak', icon: 'Flame', value: `${streak}d`, label: 'Quest Streak' },
  ];

  return (
    <View className="flex-row flex-wrap gap-3">
      {stats.map((stat) => (
        <View key={stat.id} className="basis-[47%] gap-2 rounded-xl border border-subtle bg-elevated p-3 md:basis-0 md:flex-1">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-tide-teal/10">
            <Icon name={stat.icon} size={15} color={colors.brand.tideTeal} />
          </View>
          <Text variant="h3" color="primary">
            {stat.value}
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

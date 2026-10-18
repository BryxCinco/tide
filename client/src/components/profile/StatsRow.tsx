import { useEffect } from 'react';
import { View } from 'react-native';

import { useJournalStore } from '../../store/journalStore';
import { useDayStreak } from '../../store/streakStore';
import { useTimerStore } from '../../store/timerStore';
import { formatDuration } from '../../utils/formatTime';
import { BentoStat, type IconName } from '../ui';

/**
 * Four bento stat tiles — 2x2 on phone, one row from tablet up. Focus Time / Sessions are
 * TODAY's real numbers (timerStore): there's no all-time aggregate endpoint yet. Reads
 * useTimerStore directly, not the useTimer() hook, which would also mount a second ticking
 * interval while Timer is open elsewhere.
 */
export function StatsRow({ startIndex = 2 }: { startIndex?: number }) {
  const journalCount = useJournalStore((s) => s.entries.length);
  const streak = useDayStreak();
  const todaySessions = useTimerStore((s) => s.todaySessions);
  const activityTotals = useTimerStore((s) => s.activityTotals);
  const fetchTodaySessions = useTimerStore((s) => s.fetchTodaySessions);

  useEffect(() => {
    fetchTodaySessions();
  }, [fetchTodaySessions]);

  const todayTotalSeconds = Object.values(activityTotals).reduce((sum, value) => sum + value, 0);

  const stats: { id: string; icon: IconName; color: string; value: string; label: string }[] = [
    { id: 'focus-time', icon: 'Timer', color: '#14B8A6', value: formatDuration(todayTotalSeconds), label: 'focus today' },
    { id: 'sessions', icon: 'Zap', color: '#6366F1', value: String(todaySessions.length), label: 'sessions today' },
    { id: 'journal', icon: 'BookOpen', color: '#0EA5E9', value: String(journalCount), label: 'journal entries' },
    { id: 'streak', icon: 'Flame', color: '#F97316', value: `${streak}`, label: 'day streak' },
  ];

  return (
    <View className="flex-row flex-wrap gap-3 md:flex-nowrap md:gap-4">
      {stats.map((stat, i) => (
        <BentoStat
          key={stat.id}
          className="basis-[47%] grow md:basis-0"
          index={startIndex + i}
          icon={stat.icon}
          color={stat.color}
          value={stat.value}
          label={stat.label}
        />
      ))}
    </View>
  );
}

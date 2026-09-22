import { View } from 'react-native';

import { useJournalStore } from '../../store/journalStore';
import { MOCK_PROFILE_STATS } from '../../mocks/mockUser';
import { Icon, Text, type IconName } from '../ui';
import { colors } from '../../utils/theme';

interface MiniStat {
  id: string;
  icon: IconName;
  value: string;
  label: string;
}

/** 2x2 on phone, 4-across from tablet up — same breakpoint behavior as the Dashboard's
 * StatsRow, just a smaller/denser card since these four don't need trend lines or
 * count-up animation (Profile is a settings screen, not the Dashboard's hero surface). */
export function StatsRow() {
  const journalCount = useJournalStore((s) => s.entries.length);

  const stats: MiniStat[] = [
    { id: 'focus-time', icon: 'Timer', value: MOCK_PROFILE_STATS.totalFocusTime, label: 'Focus Time' },
    { id: 'sessions', icon: 'Zap', value: MOCK_PROFILE_STATS.sessions, label: 'Sessions' },
    { id: 'journal', icon: 'BookOpen', value: String(journalCount), label: 'Journal Entries' },
    { id: 'streak', icon: 'Flame', value: MOCK_PROFILE_STATS.currentStreak, label: 'Current Streak' },
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

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { AccentTone, TimeLogEntry } from '../../types/dashboard';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Divider, EmptyState, Icon, Text } from '../ui';

// 'muted' has no explicit icon color — Icon's own default already resolves to the
// theme-reactive muted tone, so omitting it here (rather than a static light-mode hex)
// keeps it correct in dark mode too.
const tintClasses: Record<AccentTone, { bg: string; icon?: string }> = {
  teal: { bg: 'bg-tide-teal/10', icon: colors.brand.tideTeal },
  blue: { bg: 'bg-ocean-blue/10', icon: colors.brand.oceanBlue },
  purple: { bg: 'bg-deep-purple/10', icon: colors.brand.deepPurple },
  muted: { bg: 'bg-hover' },
};

export interface RecentActivityProps {
  entries: TimeLogEntry[];
}

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <View className="rounded-2xl border border-subtle bg-base p-6">
      <View className="mb-2 flex-row items-center justify-between">
        <Text variant="h3" color="primary">
          Recent Activity
        </Text>
        <Pressable onPress={() => router.push('/timer')} hitSlop={8}>
          <Text variant="body" color="accent" className="font-medium">
            View all
          </Text>
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <EmptyState
          icon="Clock"
          title="No activity yet"
          description="Start your first focus session to see your activity here."
          actionLabel="Start Timer"
          onAction={() => router.push('/timer')}
        />
      ) : (
        entries.map((entry, index) => {
          const tone = tintClasses[entry.tint];
          return (
            <View key={entry.id}>
              {index > 0 && <Divider spacing="sm" />}
              <View className="flex-row items-center gap-3 py-2">
                <View className={cn('h-10 w-10 items-center justify-center rounded-full', tone.bg)}>
                  <Icon name={entry.icon} size={18} color={tone.icon} />
                </View>
                <View className="flex-1">
                  <Text variant="body" color="primary" className="font-medium">
                    {entry.activity}
                  </Text>
                  <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal">
                    {entry.startTime} {'–'} {entry.endTime}
                  </Text>
                </View>
                <Text variant="body" color="primary" className="font-semibold">
                  {entry.duration}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

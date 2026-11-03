import { router } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { AccentTone, TimeLogEntry } from '../../types/dashboard';
import { hexToRgba } from '../../utils/color';
import { ocean } from '../../utils/theme';
import { BentoHeader, BentoTile, Icon, Text } from '../ui';

const TINT: Record<AccentTone, string | undefined> = {
  teal: ocean.lagoon,
  blue: ocean.surf,
  purple: ocean.lavender,
  muted: undefined,
  red: '#F87171',
};

export interface RecentActivityProps {
  entries: TimeLogEntry[];
}

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <BentoTile tone="glass" dense>
      <View className="gap-2">
        <BentoHeader
          dense
          title="Recent activity"
          icon="History"
          color={ocean.surf}
          right={
            <Pressable onPress={() => router.push('/timer')} hitSlop={8} className="rounded-md px-1.5 py-1 hover:bg-hover">
              <Text variant="body" color="accent" className="text-[12px] font-semibold">
                View all
              </Text>
            </Pressable>
          }
        />

        {entries.length === 0 ? (
          <View className="flex-row items-center gap-2.5 rounded-xl bg-hover/60 px-2.5 py-2">
            <Icon name="Clock" size={14} />
            <Text variant="body" color="muted" className="flex-1 text-[12.5px]">
              No sessions yet today.
            </Text>
            <Pressable onPress={() => router.push('/timer')} hitSlop={6} className="rounded-full bg-tide-teal/10 px-2.5 py-1 hover:bg-tide-teal/20">
              <Text variant="body" color="accent" className="text-[11.5px] font-semibold">
                Start timer
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {entries.map((entry, index) => {
              const tint = TINT[entry.tint];
              return (
                <View key={entry.id} className={index > 0 ? 'flex-row items-center gap-2.5 border-t border-subtle py-2' : 'flex-row items-center gap-2.5 py-2'}>
                  <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: tint ? hexToRgba(tint, 0.13) : undefined }}>
                    <Icon name={entry.icon} size={14} color={tint} strokeWidth={2.2} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text variant="body" color="primary" className="text-[13px] font-medium" numberOfLines={1}>
                      {entry.activity}
                    </Text>
                    <Text variant="body" color="muted" className="text-[11px]">
                      {entry.startTime} {'–'} {entry.endTime}
                    </Text>
                  </View>
                  <Text variant="body" color="primary" className="text-[12.5px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
                    {entry.duration}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </BentoTile>
  );
}

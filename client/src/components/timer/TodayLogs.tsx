import { View } from 'react-native';

import type { Session } from '../../types/timer';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { ocean } from '../../utils/theme';
import { Badge, BentoHeader, BentoTile, Divider, EmptyState, Icon, Text, type IconName } from '../ui';

export interface TodayLogsProps {
  sessions: Session[];
}

export function TodayLogs({ sessions }: TodayLogsProps) {
  return (
    <BentoTile tone="glass" dense index={5}>
      <BentoHeader
        dense
        className="mb-1"
        title="Today's Sessions"
        icon="Clock"
        color={ocean.lagoon}
        right={sessions.length > 0 ? <Badge label={String(sessions.length)} variant="teal" size="sm" /> : undefined}
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon="Clock"
          title="No sessions yet"
          description="Start your first session above to see it here."
        />
      ) : (
        sessions.map((session, index) => {
          return (
            <View key={session.id}>
              {index > 0 && <Divider spacing="sm" />}
              <View className="flex-row items-center gap-2.5 py-1.5">
                <View
                  className="h-8 w-8 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: hexToRgba(session.color, 0.13) }}
                >
                  <Icon name={session.icon as IconName} size={15} color={session.color} />
                </View>
                <View className="flex-1">
                  <Text variant="body" color="primary" className="text-[13.5px] font-semibold">
                    {session.activityLabel}
                  </Text>
                  <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal">
                    {session.startTime} {'–'} {session.endTime}
                  </Text>
                  {session.tags.length > 0 && (
                    <View className="mt-1.5 flex-row flex-wrap gap-1">
                      {session.tags.map((tag) => (
                        <Badge key={tag} label={tag} variant="default" size="sm" />
                      ))}
                    </View>
                  )}
                </View>
                <Text variant="body" color="primary" className="text-[13.5px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatDuration(session.durationSeconds)}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </BentoTile>
  );
}

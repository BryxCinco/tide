import { View } from 'react-native';

import type { Session } from '../../types/timer';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { Badge, Divider, EmptyState, Icon, Text, type IconName } from '../ui';

export interface TodayLogsProps {
  sessions: Session[];
}

export function TodayLogs({ sessions }: TodayLogsProps) {
  return (
    <View className="rounded-2xl border border-subtle bg-base p-6">
      <View className="mb-2 flex-row items-center gap-2">
        <Text variant="h3" color="primary">
          Today&apos;s Sessions
        </Text>
        {sessions.length > 0 && <Badge label={String(sessions.length)} variant="teal" size="sm" />}
      </View>

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
              <View className="flex-row items-center gap-3 py-2">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: hexToRgba(session.color, 0.1) }}
                >
                  <Icon name={session.icon as IconName} size={18} color={session.color} />
                </View>
                <View className="flex-1">
                  <Text variant="body" color="primary" className="font-semibold">
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
                <Text variant="body" color="primary" className="font-semibold">
                  {formatDuration(session.durationSeconds)}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

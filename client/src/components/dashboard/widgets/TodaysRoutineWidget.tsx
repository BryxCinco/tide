import { router } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../../ui/SoundPressable';

import { useActivityStore } from '../../../store/activityStore';
import { useTimerStore } from '../../../store/timerStore';
import { isActivityScheduledOn } from '../../../utils/activityRecurrence';
import { hexToRgba } from '../../../utils/color';
import { Card, EmptyState, Icon, Text, type IconName } from '../../ui';

/** Full-width (not compact) — a list of today's recurring activities needs more room than
 * the small square tiles StreakWidget/TimeWidget use. Quick-starting an activity here sets
 * it as the Timer's current activity (same as picking it from ActivityPicker) and navigates
 * there — it doesn't start the session itself, since the Timer screen is also where
 * duration-mode/countdown choices and the actual Start button live. */
export function TodaysRoutineWidget() {
  const activities = useActivityStore((s) => s.activities);
  const setActivity = useTimerStore((s) => s.setActivity);

  const todayActivities = activities.filter((a) => !a.isArchived && isActivityScheduledOn(a));

  const handleQuickStart = (activity: (typeof activities)[number]) => {
    setActivity(activity);
    router.push('/timer');
  };

  return (
    <Card variant="default" padding="md" className="rounded-[24px] gap-3">
      <Text variant="h3" color="primary">
        Today's Routine
      </Text>

      {todayActivities.length === 0 ? (
        <EmptyState
          icon="Repeat"
          title="No recurring activities today"
          description="Set up a daily, weekly, or custom recurrence on an activity to see it here."
        />
      ) : (
        <View className="gap-2">
          {todayActivities.map((activity) => (
            <Pressable
              key={activity.id}
              onPress={() => handleQuickStart(activity)}
              className="flex-row items-center gap-3 rounded-xl border border-subtle bg-base p-3 hover:border-default"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: hexToRgba(activity.color, 0.1) }}>
                <Icon name={activity.icon as IconName} size={18} color={activity.color} />
              </View>
              <Text variant="body" color="primary" className="flex-1 font-medium">
                {activity.name}
              </Text>
              <Icon name="Play" size={16} color={activity.color} />
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

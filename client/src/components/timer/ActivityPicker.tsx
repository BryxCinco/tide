import { useMemo } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { Activity } from '../../types/activity';
import { isActivityScheduledOn } from '../../utils/activityRecurrence';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { Icon, Text, type IconName } from '../ui';

export interface ActivityPickerProps {
  activities: Activity[];
  selectedId?: string;
  onSelect: (activity: Activity) => void;
  /** Locked once a session has started. */
  disabled?: boolean;
  /** Renders a trailing "+ Custom" chip that opens the create-activity modal. Omit to hide it. */
  onAddCustom?: () => void;
  /** Shows an X badge on the selected chip and lets re-tapping it deselect — only sensible
   * while idle, since a running/paused session always needs an activity to log against. */
  onDeselect?: () => void;
  /** Renders a "Surprise Me" shuffle button at the top-right of the picker — picks a random
   * activity on the caller's behalf (weighted toward ones not done recently). Omit to hide. */
  onShuffle?: () => void;
  /** At most 3 across at every width — for a narrower bento column, where the default 6-across
   * desktop grid would crush each chip. */
  compact?: boolean;
}

/** 2-across on phone, 3-across on tablet (md, 768px+), 6-across on desktop (lg, 1024px+).
 * Single-select. Colors are arbitrary hex (custom activities), so tinting goes through
 * inline style via hexToRgba rather than Tailwind classes. */
export function ActivityPicker({
  activities,
  selectedId,
  onSelect,
  disabled = false,
  onAddCustom,
  onDeselect,
  onShuffle,
  compact = false,
}: ActivityPickerProps) {
  const chipBasis = compact ? 'basis-[30%] grow' : 'basis-[47%] md:basis-[30%] lg:basis-[14%]';
  // Only split into "Today"/"All" sections once there's actually at least one recurring
  // activity scheduled for today — otherwise every account (the vast majority, who've never
  // touched recurrence) sees the exact same flat grid as before this existed.
  const todayActivities = useMemo(() => activities.filter((a) => isActivityScheduledOn(a)), [activities]);
  const otherActivities = useMemo(
    () => (todayActivities.length > 0 ? activities.filter((a) => !isActivityScheduledOn(a)) : activities),
    [activities, todayActivities],
  );

  const renderGrid = (list: Activity[], showAddCustom: boolean) => (
    <View className="flex-row flex-wrap gap-3">
      {list.map((activity) => {
        const isSelected = activity.id === selectedId;

        return (
          <Pressable
            key={activity.id}
            disabled={disabled}
            onPress={() => (isSelected && onDeselect ? onDeselect() : onSelect(activity))}
            className={cn(
              cn('relative items-center gap-2 rounded-2xl border p-3', chipBasis),
              isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
              disabled && !isSelected && 'opacity-50',
            )}
          >
            {isSelected && onDeselect && (
              <Pressable
                onPress={onDeselect}
                hitSlop={8}
                className="absolute right-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full bg-tide-teal"
              >
                <Icon name="X" size={11} color="#FFFFFF" />
              </Pressable>
            )}
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: hexToRgba(activity.color, 0.1) }}
            >
              <Icon name={activity.icon as IconName} size={20} color={activity.color} />
            </View>
            <Text
              variant="caption"
              color={isSelected ? 'accent' : 'secondary'}
              className="text-center normal-case tracking-normal"
            >
              {activity.name}
            </Text>
          </Pressable>
        );
      })}

      {showAddCustom && onAddCustom && (
        <Pressable
          disabled={disabled}
          onPress={onAddCustom}
          className={cn(
            cn('items-center gap-2 rounded-2xl border border-dashed border-subtle bg-base p-3', chipBasis),
            disabled && 'opacity-50',
          )}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-surface">
            <Icon name="Plus" size={20} />
          </View>
          <Text variant="caption" color="muted" className="text-center normal-case tracking-normal">
            Custom
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View className="gap-3">
      {onShuffle && (
        <View className="flex-row items-center justify-between">
          <Text variant="label" color="muted">
            Activity
          </Text>
          <Pressable
            disabled={disabled}
            onPress={onShuffle}
            className={cn(
              'flex-row items-center gap-1.5 rounded-full border border-subtle bg-base px-3 py-1.5 hover:border-default',
              disabled && 'opacity-50',
            )}
          >
            <Icon name="Shuffle" size={13} />
            <Text variant="caption" color="secondary" className="normal-case tracking-normal">
              Surprise Me
            </Text>
          </Pressable>
        </View>
      )}

      {todayActivities.length > 0 ? (
        <>
          <View className="gap-2">
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              Today's Activities
            </Text>
            {renderGrid(todayActivities, false)}
          </View>
          <View className="gap-2">
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              All Activities
            </Text>
            {renderGrid(otherActivities, true)}
          </View>
        </>
      ) : (
        renderGrid(otherActivities, true)
      )}
    </View>
  );
}

import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { Activity } from '../../types/activity';
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
}: ActivityPickerProps) {
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
      <View className="flex-row flex-wrap gap-3">
        {activities.map((activity) => {
          const isSelected = activity.id === selectedId;

          return (
            <Pressable
              key={activity.id}
              disabled={disabled}
              onPress={() => (isSelected && onDeselect ? onDeselect() : onSelect(activity))}
              className={cn(
                'relative basis-[47%] items-center gap-2 rounded-xl border p-3 md:basis-[30%] lg:basis-[14%]',
                isSelected ? 'border-tide-teal bg-tide-teal/5' : 'border-subtle bg-base',
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

        {onAddCustom && (
          <Pressable
            disabled={disabled}
            onPress={onAddCustom}
            className={cn(
              'basis-[47%] items-center gap-2 rounded-xl border border-dashed border-subtle bg-base p-3 md:basis-[30%] lg:basis-[14%]',
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
    </View>
  );
}

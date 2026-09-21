import { Pressable, View } from 'react-native';

import type { Activity } from '../../types/activity';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { colors } from '../../utils/theme';
import { Icon, Text, type IconName } from '../ui';

export interface ActivityPickerProps {
  activities: Activity[];
  selectedId?: string;
  onSelect: (activity: Activity) => void;
  /** Locked once a session has started. */
  disabled?: boolean;
  /** Renders a trailing "+ Custom" chip that opens the create-activity modal. Omit to hide it. */
  onAddCustom?: () => void;
}

/** 2-across on phone, 3-across on tablet (md, 768px+), 6-across on desktop (lg, 1024px+).
 * Single-select. Colors are arbitrary hex (custom activities), so tinting goes through
 * inline style via hexToRgba rather than Tailwind classes. */
export function ActivityPicker({ activities, selectedId, onSelect, disabled = false, onAddCustom }: ActivityPickerProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {activities.map((activity) => {
        const isSelected = activity.id === selectedId;

        return (
          <Pressable
            key={activity.id}
            disabled={disabled}
            onPress={() => onSelect(activity)}
            className={cn(
              'basis-[47%] items-center gap-2 rounded-xl border p-3 md:basis-[30%] lg:basis-[14%]',
              isSelected ? 'border-tide-teal bg-tide-teal/5' : 'border-subtle bg-base',
              disabled && !isSelected && 'opacity-50',
            )}
          >
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
            'basis-[47%] items-center gap-2 rounded-xl border border-dashed border-default bg-base p-3 md:basis-[30%] lg:basis-[14%]',
            disabled && 'opacity-50',
          )}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-surface">
            <Icon name="Plus" size={20} color={colors.text.muted} />
          </View>
          <Text variant="caption" color="muted" className="text-center normal-case tracking-normal">
            Custom
          </Text>
        </Pressable>
      )}
    </View>
  );
}

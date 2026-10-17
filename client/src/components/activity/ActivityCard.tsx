import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { Activity } from '../../types/activity';
import { recurrenceBadgeLabel } from '../../utils/activityRecurrence';
import { hexToRgba } from '../../utils/color';
import { cn } from '../../utils/cn';
import { formatDateKeyShort } from '../../utils/formatDate';
import { FadeInView, Icon, Text, VisibleDeleteButton, type IconName } from '../ui';

export interface ActivityCardProps {
  activity: Activity;
  /** Tapping the card body opens the view-only info modal; Edit stays its own button. */
  onInfo: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  /** Earlier / later in the grid's order. */
  onMoveBack: () => void;
  onMoveForward: () => void;
  canMoveBack: boolean;
  canMoveForward: boolean;
  /** Custom activities only — permanent delete. */
  onDelete: () => void;
  /** Built-in activities get "Hide" (archive) instead of delete; archived ones un-hide. */
  onToggleHide: () => void;
  index?: number;
  className?: string;
}

function ToolButton({ icon, onPress, disabled, label, color }: { icon: IconName; onPress: () => void; disabled?: boolean; label: string; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={label}
      className={cn('h-8 w-8 items-center justify-center rounded-lg hover:bg-elevated', disabled && 'opacity-30')}
    >
      <Icon name={icon} size={15} color={color} />
    </Pressable>
  );
}

/**
 * One activity as a grid card: a soft wash of the activity's color behind a large icon
 * tile, its name and schedule, then a slim toolbar (reorder, favorite, edit,
 * delete/hide) along the bottom edge.
 */
export function ActivityCard({
  activity,
  onInfo,
  onEdit,
  onToggleFavorite,
  onMoveBack,
  onMoveForward,
  canMoveBack,
  canMoveForward,
  onDelete,
  onToggleHide,
  index = 0,
  className,
}: ActivityCardProps) {
  const themeColors = useThemeColors();
  const isCustom = activity.category === 'custom';
  const recurrence = recurrenceBadgeLabel(activity);

  return (
    <FadeInView index={index} className={className}>
      <View className="flex-1 overflow-hidden rounded-[20px] border border-subtle bg-base hover:border-tide-teal/30">
        <Pressable onPress={onInfo} accessibilityLabel={`${activity.name} details`} className="flex-1 gap-3 p-4">
          {/* Color wash in the top-right corner — each card carries its activity's color. */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: hexToRgba(activity.color, 0.12) }}
          />

          <View className="flex-row items-start justify-between">
            <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: hexToRgba(activity.color, 0.15) }}>
              <Icon name={activity.icon as IconName} size={22} color={activity.color} />
            </View>
            <View className="flex-row gap-1">
              {isCustom && (
                <View className="rounded-full bg-elevated px-2 py-0.5">
                  <Text variant="label" color="muted" style={{ fontSize: 9 }}>
                    Custom
                  </Text>
                </View>
              )}
              {activity.isArchived && (
                <View className="rounded-full bg-warning/15 px-2 py-0.5">
                  <Text variant="label" className="text-warning" style={{ fontSize: 9 }}>
                    Hidden
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="gap-0.5">
            <Text variant="body" color="primary" className="text-[15px] font-semibold" numberOfLines={1}>
              {activity.name}
            </Text>
            <View className="flex-row items-center gap-1">
              <Icon name={recurrence ? 'Repeat' : 'Circle'} size={11} color={recurrence ? activity.color : themeColors.text.disabled} />
              <Text variant="body" color="muted" className="text-[12px]" numberOfLines={1}>
                {recurrence ?? 'Not scheduled'}
                {activity.recurrenceType !== 'none' && activity.endDate ? ` · until ${formatDateKeyShort(activity.endDate)}` : ''}
              </Text>
            </View>
          </View>
        </Pressable>

        <View className="flex-row items-center justify-between border-t border-subtle px-2 py-1">
          <View className="flex-row">
            <ToolButton icon="ChevronLeft" label="Move earlier" onPress={onMoveBack} disabled={!canMoveBack} />
            <ToolButton icon="ChevronRight" label="Move later" onPress={onMoveForward} disabled={!canMoveForward} />
          </View>
          <View className="flex-row items-center">
            <Pressable
              onPress={onToggleFavorite}
              hitSlop={4}
              accessibilityLabel={activity.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="h-8 w-8 items-center justify-center rounded-lg hover:bg-elevated"
            >
              <Icon
                name="Star"
                size={15}
                color={activity.isFavorite ? themeColors.status.warning : undefined}
                fill={activity.isFavorite ? themeColors.status.warning : 'none'}
              />
            </Pressable>
            <ToolButton icon="Pencil" label="Edit activity" onPress={onEdit} />
            {isCustom ? (
              <VisibleDeleteButton
                onConfirm={onDelete}
                confirmTitle="Delete activity?"
                confirmMessage={`"${activity.name}" will be removed. Past sessions logged under it keep their record.`}
              />
            ) : activity.isArchived ? (
              <ToolButton icon="Eye" label="Show again" onPress={onToggleHide} />
            ) : (
              <VisibleDeleteButton variant="hide" onConfirm={onToggleHide} />
            )}
          </View>
        </View>
      </View>
    </FadeInView>
  );
}

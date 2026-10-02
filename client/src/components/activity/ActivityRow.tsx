import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { Activity } from '../../types/activity';
import { recurrenceBadgeLabel } from '../../utils/activityRecurrence';
import { hexToRgba } from '../../utils/color';
import { colors } from '../../utils/theme';
import { cn } from '../../utils/cn';
import { formatDateKeyShort } from '../../utils/formatDate';
import { Badge, Icon, Text, VisibleDeleteButton, type IconName } from '../ui';

export interface ActivityRowProps {
  activity: Activity;
  /** Tapping the row's main body (icon + name) opens the view-only info modal — Edit stays
   * an explicit, separate action (the pencil icon below), never triggered by this. */
  onInfo: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Custom activities only — deletePermanently removes it (activityStore.deleteActivity
   * already refuses anything that isn't category:'custom', this just controls whether the
   * button renders at all). */
  onDelete: () => void;
  /** Predefined activities get "Hide" (archive) instead of delete — they can't be removed,
   * only kept out of the active pickers. Toggles isArchived; already-archived rows call
   * this to un-hide instead. */
  onToggleHide: () => void;
}

export function ActivityRow({
  activity,
  onInfo,
  onEdit,
  onToggleFavorite,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDelete,
  onToggleHide,
}: ActivityRowProps) {
  const isCustom = activity.category === 'custom';
  const recurrenceLabel = recurrenceBadgeLabel(activity);
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-subtle bg-base p-3">
      <Pressable onPress={onInfo} className="flex-1 flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: hexToRgba(activity.color, 0.1) }}
        >
          <Icon name={activity.icon as IconName} size={18} color={activity.color} />
        </View>

        <View className="flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="body" color="primary" className="font-medium">
              {activity.name}
            </Text>
            {activity.category === 'custom' && <Badge label="Custom" variant="default" size="sm" />}
            {recurrenceLabel && <Badge label={recurrenceLabel} variant="teal" size="sm" />}
            {activity.isArchived && <Badge label="Archived" variant="warning" size="sm" />}
          </View>
          {activity.recurrenceType !== 'none' && activity.endDate && (
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              Until {formatDateKeyShort(activity.endDate)}
            </Text>
          )}
        </View>
      </Pressable>

      <View className="flex-row items-center">
        <Pressable
          onPress={onMoveUp}
          disabled={!canMoveUp}
          hitSlop={6}
          className={cn('h-10 w-10 items-center justify-center', !canMoveUp && 'opacity-30')}
        >
          <Icon name="ChevronUp" size={18} />
        </Pressable>
        <Pressable
          onPress={onMoveDown}
          disabled={!canMoveDown}
          hitSlop={6}
          className={cn('h-10 w-10 items-center justify-center', !canMoveDown && 'opacity-30')}
        >
          <Icon name="ChevronDown" size={18} />
        </Pressable>
        <Pressable onPress={onToggleFavorite} hitSlop={4} className="h-10 w-10 items-center justify-center">
          <Icon
            name="Star"
            size={18}
            color={activity.isFavorite ? colors.status.warning : undefined}
            fill={activity.isFavorite ? colors.status.warning : 'none'}
          />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={4} className="h-10 w-10 items-center justify-center">
          <Icon name="Pencil" size={18} />
        </Pressable>
        {isCustom ? (
          <VisibleDeleteButton
            onConfirm={onDelete}
            confirmTitle="Delete activity?"
            confirmMessage={`"${activity.name}" will be removed. Past sessions logged under it keep their record.`}
          />
        ) : (
          !activity.isArchived && <VisibleDeleteButton variant="hide" onConfirm={onToggleHide} />
        )}
      </View>
    </View>
  );
}

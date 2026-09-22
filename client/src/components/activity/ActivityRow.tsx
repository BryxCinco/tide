import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { Activity } from '../../types/activity';
import { hexToRgba } from '../../utils/color';
import { colors } from '../../utils/theme';
import { Badge, Icon, Text, VisibleDeleteButton, type IconName } from '../ui';

export interface ActivityRowProps {
  activity: Activity;
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
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-subtle bg-base p-3">
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: hexToRgba(activity.color, 0.1) }}
      >
        <Icon name={activity.icon as IconName} size={18} color={activity.color} />
      </View>

      <View className="flex-1 flex-row flex-wrap items-center gap-2">
        <Text variant="body" color="primary" className="font-medium">
          {activity.name}
        </Text>
        {activity.category === 'custom' && <Badge label="Custom" variant="default" size="sm" />}
        {activity.isArchived && <Badge label="Archived" variant="warning" size="sm" />}
      </View>

      <View className="flex-row items-center gap-1">
        <Pressable onPress={onMoveUp} disabled={!canMoveUp} hitSlop={6} className={!canMoveUp ? 'opacity-30' : undefined}>
          <Icon name="ChevronUp" size={18} />
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={!canMoveDown} hitSlop={6} className={!canMoveDown ? 'opacity-30' : undefined}>
          <Icon name="ChevronDown" size={18} />
        </Pressable>
        <Pressable onPress={onToggleFavorite} hitSlop={6} className="ml-1">
          <Icon
            name="Star"
            size={18}
            color={activity.isFavorite ? colors.status.warning : undefined}
            fill={activity.isFavorite ? colors.status.warning : 'none'}
          />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={6} className="ml-1">
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

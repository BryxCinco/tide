import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import type { Activity } from '../../types/activity';
import { recurrenceBadgeLabel } from '../../utils/activityRecurrence';
import { hexToRgba } from '../../utils/color';
import { colors } from '../../utils/theme';
import { cn } from '../../utils/cn';
import { formatDateKeyShort } from '../../utils/formatDate';
import { Badge, FadeInView, Icon, Text, VisibleDeleteButton, type IconName } from '../ui';

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
  /** Position within its group — staggers the row's entrance left-to-right-ish (same idea
   * as JournalCard/WidgetGrid), capped so a long list doesn't end in a slow crawl. */
  index?: number;
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
  index = 0,
}: ActivityRowProps) {
  const isCustom = activity.category === 'custom';
  const recurrenceLabel = recurrenceBadgeLabel(activity);
  const { isPhone } = useResponsive();
  return (
    <FadeInView index={index}>
      <View className="flex-row items-center gap-3 overflow-hidden rounded-2xl border border-subtle bg-base hover:border-tide-teal/30">
        {/* Category-colored edge — the same per-item accent language JournalCard now uses,
            so a glance down the list reads activity identity by color before the text. */}
        <View className="w-1 self-stretch" style={{ backgroundColor: activity.color }} />

        {/* Phone stacks the action buttons under the name so five 40px buttons don't squeeze
            the name down to a few characters; wider screens keep everything on one line. */}
        <View className={cn('flex-1', isPhone ? 'pb-1.5' : 'flex-row items-center')} style={{ minWidth: 0 }}>
          <Pressable onPress={onInfo} className="flex-1 flex-row items-center gap-3 py-3 pl-3 pr-1">
            <View
              className="h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: hexToRgba(activity.color, 0.12) }}
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

          <View className={cn('flex-row items-center gap-1 pr-2', isPhone && 'justify-end')}>
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
      </View>
    </FadeInView>
  );
}

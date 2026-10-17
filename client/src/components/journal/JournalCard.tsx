import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { JournalEntry } from '../../types/journal';
import { confirmAsync } from '../../utils/confirm';
import { formatTime, formatWeekdayMonthDay } from '../../utils/formatDate';
import { Badge, Card, Icon, Text, VisibleDeleteButton } from '../ui';
import { MOOD_ICON_MAP } from './MoodIcon';

export interface JournalCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onToggleFavorite: () => void;
  /** Raw delete — no confirmation of its own. Both the long-press shortcut below and the
   * always-visible VisibleDeleteButton confirm before calling this, so it stays a plain
   * "just delete" action rather than each caller needing to know it's pre-guarded. */
  onDelete: () => void;
  /** Position in the visible list — staggers this card's entrance so the grid fills in
   * rather than popping in as one flat block (same idea as WidgetGrid's own stagger). */
  index?: number;
}

const STAGGER_MS = 45;

export function JournalCard({ entry, onPress, onToggleFavorite, onDelete, index = 0 }: JournalCardProps) {
  const mood = entry.mood ? MOOD_ICON_MAP[entry.mood] : undefined;
  const themeColors = useThemeColors();
  const accentColor = mood?.color ?? themeColors.brand.tideTeal;

  const handleLongPressDelete = async () => {
    const confirmed = await confirmAsync('Delete entry?', `"${entry.title || 'This entry'}" will be removed. This can't be undone.`);
    if (confirmed) onDelete();
  };

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 8) * STAGGER_MS).duration(360)}>
      <Pressable onPress={onPress} onLongPress={handleLongPressDelete}>
        <Card
          variant="default"
          padding="lg"
          accentColor={accentColor}
          className="gap-3 border-subtle bg-base hover:shadow-sm"
        >
          <View className="flex-row items-start justify-between">
            <View>
              <Text variant="body" color="primary" className="font-semibold normal-case tracking-normal">
                {formatWeekdayMonthDay(entry.createdAt)}
              </Text>
              <Text variant="caption" color="muted" className="normal-case tracking-normal">
                {formatTime(entry.createdAt)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Pressable onPress={onToggleFavorite} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full hover:bg-elevated">
                <Icon
                  name="Star"
                  size={18}
                  color={entry.isFavorite ? themeColors.status.warning : themeColors.text.disabled}
                  fill={entry.isFavorite ? themeColors.status.warning : 'none'}
                />
              </Pressable>
              <VisibleDeleteButton
                onConfirm={onDelete}
                confirmTitle="Delete entry?"
                confirmMessage={`"${entry.title || 'This entry'}" will be removed. This can't be undone.`}
              />
            </View>
          </View>

          {mood && (
            <View className="flex-row items-center gap-1.5">
              <Icon name={mood.icon} size={15} color={mood.color} />
              <Text variant="caption" className="normal-case tracking-normal" style={{ color: mood.color }}>
                {mood.label}
              </Text>
            </View>
          )}

          <View className="gap-1">
            <Text variant="h3" color="primary">
              {entry.title}
            </Text>
            <Text variant="body" color="secondary" numberOfLines={2}>
              {entry.content}
            </Text>
          </View>

          {entry.tags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <Badge key={tag} label={tag} variant="teal" size="sm" />
              ))}
            </View>
          )}
        </Card>
      </Pressable>
    </Animated.View>
  );
}

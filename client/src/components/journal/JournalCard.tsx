import { Pressable, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { JournalEntry } from '../../types/journal';
import { formatTime, formatWeekdayMonthDay } from '../../utils/formatDate';
import { Badge, Card, Icon, Text } from '../ui';
import { MOOD_ICON_MAP } from './MoodIcon';

export interface JournalCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onToggleFavorite: () => void;
  /** Long-press quick action — the list has no per-row menu, so long-press is the delete shortcut. */
  onDelete: () => void;
}

export function JournalCard({ entry, onPress, onToggleFavorite, onDelete }: JournalCardProps) {
  const mood = entry.mood ? MOOD_ICON_MAP[entry.mood] : undefined;
  const themeColors = useThemeColors();

  return (
    <Pressable onPress={onPress} onLongPress={onDelete}>
      <Card variant="default" padding="lg" className="gap-3 border-subtle bg-base hover:shadow-sm">
        <View className="flex-row items-start justify-between">
          <View>
            <Text variant="body" color="primary" className="font-semibold normal-case tracking-normal">
              {formatWeekdayMonthDay(entry.createdAt)}
            </Text>
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {formatTime(entry.createdAt)}
            </Text>
          </View>
          <Pressable onPress={onToggleFavorite} hitSlop={8}>
            <Icon
              name="Star"
              size={18}
              color={entry.isFavorite ? themeColors.status.warning : themeColors.text.disabled}
              fill={entry.isFavorite ? themeColors.status.warning : 'none'}
            />
          </Pressable>
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
  );
}

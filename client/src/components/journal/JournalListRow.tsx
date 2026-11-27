import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { JournalEntry } from '../../types/journal';
import { toPlainPreview } from '../../utils/blocks';
import { hexToRgba } from '../../utils/color';
import { formatTime, formatWeekdayMonthDay } from '../../utils/formatDate';
import { Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { MOOD_ICON_MAP } from './MoodIcon';

export interface JournalListRowProps {
  entry: JournalEntry;
  /** Today's entries show the time instead of the date. */
  showTime?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

/** Compact page row for the List view: mood · title + first line · tags · date · star. */
export function JournalListRow({ entry, showTime, onPress, onToggleFavorite }: JournalListRowProps) {
  const theme = useThemeColors();
  const mood = entry.mood ? MOOD_ICON_MAP[entry.mood] : null;
  const accent = mood?.color ?? theme.brand.tideTeal;
  const preview = toPlainPreview(entry.content);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${entry.title || 'Untitled'}`}
      className="flex-row items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-[rgba(100,116,139,0.07)]"
    >
      <View className="h-8 w-8 items-center justify-center rounded-[10px]" style={{ backgroundColor: hexToRgba(accent, 0.13) }}>
        <Icon name={mood?.icon ?? 'FileText'} size={15} color={accent} />
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text variant="body" color="primary" className="text-[14.5px] font-semibold" numberOfLines={1}>
          {entry.title || 'Untitled'}
        </Text>
        {!!preview && (
          <Text variant="body" color="muted" className="text-[12.5px]" numberOfLines={1}>
            {preview}
          </Text>
        )}
      </View>
      <View className="hidden flex-row gap-1 md:flex">
        {entry.tags.slice(0, 2).map((tag) => (
          <View key={tag} className="rounded-md bg-[rgba(20,184,166,0.10)] px-1.5 py-0.5">
            <Text variant="body" className="text-[11px] font-medium" style={{ color: theme.brand.tideTeal }}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="body" color="muted" className="w-[86px] text-right text-[12px]" numberOfLines={1}>
        {showTime ? formatTime(entry.createdAt) : formatWeekdayMonthDay(entry.createdAt).replace(/^\w+, /, '')}
      </Text>
      <Pressable
        onPress={onToggleFavorite}
        hitSlop={8}
        accessibilityLabel={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        className="h-7 w-7 items-center justify-center rounded-full"
      >
        <Icon
          name="Star"
          size={15}
          color={entry.isFavorite ? theme.status.warning : theme.text.disabled}
          fill={entry.isFavorite ? theme.status.warning : 'none'}
        />
      </Pressable>
    </Pressable>
  );
}

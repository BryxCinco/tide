import { Image, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { JournalEntry } from '../../types/journal';
import { confirmAsync } from '../../utils/confirm';
import { hexToRgba } from '../../utils/color';
import { cn } from '../../utils/cn';
import { formatTime, formatWeekdayMonthDay } from '../../utils/formatDate';
import { FadeInView, Icon, Text, VisibleDeleteButton } from '../ui';
import { MOOD_ICON_MAP } from './MoodIcon';

export interface JournalCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onToggleFavorite: () => void;
  /** Raw delete — no confirmation of its own. Both the long-press shortcut below and the
   * always-visible VisibleDeleteButton confirm before calling this. */
  onDelete: () => void;
  /** Position in the visible list — staggers the fade-in. */
  index?: number;
  /** The large tile of the bento grid: bigger title, more preview text, photo strip. */
  featured?: boolean;
}

export function JournalCard({ entry, onPress, onToggleFavorite, onDelete, index = 0, featured = false }: JournalCardProps) {
  const mood = entry.mood ? MOOD_ICON_MAP[entry.mood] : undefined;
  const themeColors = useThemeColors();
  const accent = mood?.color ?? themeColors.brand.tideTeal;
  const photo = entry.photoUrls?.[0];

  const handleLongPressDelete = async () => {
    const confirmed = await confirmAsync('Delete entry?', `"${entry.title || 'This entry'}" will be removed. This can't be undone.`);
    if (confirmed) onDelete();
  };

  return (
    <FadeInView index={Math.min(index, 8)} className="flex-1">
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPressDelete}
        className="flex-1 overflow-hidden rounded-[24px] border border-subtle bg-surface hover:border-tide-teal/40"
      >
        {/* Mood-tinted wash along the top — each card carries its own mood color. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -70, right: -70, width: 150, height: 150, borderRadius: 75, backgroundColor: hexToRgba(accent, 0.07) }}
        />

        {featured && photo && (
          <Image source={{ uri: photo }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
        )}

        <View className={cn('flex-1 gap-3', featured ? 'p-6' : 'p-5')}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-row items-center gap-2.5" style={{ flexShrink: 1 }}>
              <View
                className="items-center justify-center rounded-xl"
                style={{ width: 40, height: 40, backgroundColor: hexToRgba(accent, 0.12) }}
              >
                <Icon name={mood?.icon ?? 'BookOpen'} size={18} color={accent} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text variant="body" color="primary" className="text-[13px] font-semibold" numberOfLines={1}>
                  {formatWeekdayMonthDay(entry.createdAt)}
                </Text>
                <Text variant="body" color="muted" className="text-[12px]" numberOfLines={1}>
                  {formatTime(entry.createdAt)}
                  {mood ? ` · ${mood.label}` : ''}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-0.5">
              <Pressable
                onPress={onToggleFavorite}
                hitSlop={8}
                accessibilityLabel={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                className="h-8 w-8 items-center justify-center rounded-full hover:bg-elevated"
              >
                <Icon
                  name="Star"
                  size={17}
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

          <View className="flex-1 gap-1.5">
            <Text variant={featured ? 'h2' : 'h3'} color="primary" numberOfLines={2}>
              {entry.title || 'Untitled'}
            </Text>
            <Text variant="body" color="secondary" className="leading-[22px]" numberOfLines={featured ? 5 : 3}>
              {entry.content}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center gap-1.5">
            {entry.tags.slice(0, featured ? 5 : 3).map((tag) => (
              <View key={tag} className="rounded-full border border-subtle bg-base px-2.5 py-1">
                <Text variant="body" color="secondary" className="text-[11px] font-medium">
                  #{tag}
                </Text>
              </View>
            ))}
            {entry.photoUrls?.length > 0 && !(featured && photo) && (
              <View className="flex-row items-center gap-1 rounded-full border border-subtle bg-base px-2.5 py-1">
                <Icon name="Image" size={11} />
                <Text variant="body" color="muted" className="text-[11px] font-medium">
                  {entry.photoUrls.length}
                </Text>
              </View>
            )}
            {entry.wordCount > 0 && (
              <Text variant="body" color="muted" className="ml-auto text-[11px]">
                {entry.wordCount} words
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </FadeInView>
  );
}

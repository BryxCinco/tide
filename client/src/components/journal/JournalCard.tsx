import { Image, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { JournalEntry } from '../../types/journal';
import { confirmAsync } from '../../utils/confirm';
import { hexToRgba } from '../../utils/color';
import { cn } from '../../utils/cn';
import { formatTime, formatWeekdayMonthDay } from '../../utils/formatDate';
import { FadeInView, Icon, Text, useGlassSurface, VisibleDeleteButton } from '../ui';
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
  const glass = useGlassSurface();

  const handleLongPressDelete = async () => {
    const confirmed = await confirmAsync('Delete entry?', `"${entry.title || 'This entry'}" will be removed. This can't be undone.`);
    if (confirmed) onDelete();
  };

  return (
    <FadeInView index={Math.min(index, 8)} className="flex-1">
      <Pressable
        onPress={onPress}
        onLongPress={handleLongPressDelete}
        className="flex-1 overflow-hidden rounded-[20px] border hover:border-tide-teal/40"
        style={glass}
      >
        {/* Mood-tinted wash along the top — each card carries its own mood color. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: -70, right: -70, width: 150, height: 150, borderRadius: 75, backgroundColor: hexToRgba(accent, 0.07) }}
        />

        {/* Photo thumbnail for ANY entry that has one, not just the featured tile — a
            journal with a picture should actually show it on the card, not hide it behind a
            small "1" count badge. Multiple photos get a "+N" overlay in the corner instead
            of the old separate bottom badge. */}
        {photo && (
          <View>
            <Image source={{ uri: photo }} style={{ width: '100%', height: featured ? 160 : 120 }} resizeMode="cover" />
            {entry.photoUrls.length > 1 && (
              <View
                className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-full px-2 py-1"
                style={{ backgroundColor: 'rgba(2, 6, 23, 0.6)' }}
              >
                <Icon name="Image" size={11} color="#FFFFFF" />
                <Text variant="body" className="text-[11px] font-semibold" style={{ color: '#FFFFFF' }}>
                  {entry.photoUrls.length}
                </Text>
              </View>
            )}
          </View>
        )}

        <View className={cn('flex-1 gap-2.5', featured ? 'p-4' : 'p-3.5')}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-row items-center gap-2.5" style={{ flexShrink: 1 }}>
              <View
                className="items-center justify-center rounded-xl"
                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: hexToRgba(accent, 0.13) }}
              >
                <Icon name={mood?.icon ?? 'BookOpen'} size={15} color={accent} />
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
            <Text variant="h3" color="primary" className={featured ? 'text-[19px] leading-[24px]' : 'text-[15px] leading-[20px]'} numberOfLines={2}>
              {entry.title || 'Untitled'}
            </Text>
            <Text variant="body" color="secondary" className="text-[13px] leading-[19px]" numberOfLines={featured ? 5 : 3}>
              {entry.content}
            </Text>
          </View>

          <View className="flex-row flex-wrap items-center gap-1.5">
            {entry.tags.slice(0, featured ? 5 : 3).map((tag) => (
              <View key={tag} className="rounded-full border border-subtle bg-hover px-2 py-0.5">
                <Text variant="body" color="secondary" className="text-[11px] font-medium">
                  #{tag}
                </Text>
              </View>
            ))}
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

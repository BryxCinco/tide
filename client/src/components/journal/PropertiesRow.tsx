import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { Mood } from '../../types/journal';
import { formatMonthDayYear, formatTime } from '../../utils/formatDate';
import { FadeInView, Icon, type IconName, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { InterestTags } from './InterestTags';
import { JournalPhotoPicker } from './JournalPhotoPicker';
import { MOOD_ICON_MAP } from './MoodIcon';
import { MoodSelector } from './MoodSelector';

export interface PropertiesRowProps {
  mood: Mood | null;
  onMoodChange: (mood: Mood | null) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  photoUris: string[];
  onPhotosChange: (uris: string[]) => void;
  createdAt: string;
}

type PropKey = 'mood' | 'tags' | 'photos';

/**
 * Notion-style properties under the title: one quiet line per property, tap to edit it
 * inline (one open at a time), so the page itself stays about the writing.
 */
export function PropertiesRow({ mood, onMoodChange, tags, onTagsChange, photoUris, onPhotosChange, createdAt }: PropertiesRowProps) {
  const [open, setOpen] = useState<PropKey | null>(null);
  const theme = useThemeColors();
  const moodConfig = mood ? MOOD_ICON_MAP[mood] : null;
  const toggle = (key: PropKey) => setOpen((o) => (o === key ? null : key));

  const empty = (label: string) => (
    <Text variant="body" className="text-[14px]" style={{ color: theme.text.disabled }}>
      {label}
    </Text>
  );

  return (
    <View className="gap-0.5">
      <PropLine icon="Smile" label="Mood" onPress={() => toggle('mood')} active={open === 'mood'}>
        {moodConfig ? (
          <View className="flex-row items-center gap-1.5">
            <Icon name={moodConfig.icon} size={15} color={moodConfig.color} />
            <Text variant="body" className="text-[14px] font-medium" style={{ color: moodConfig.color }}>
              {moodConfig.label}
            </Text>
          </View>
        ) : (
          empty('How are you feeling?')
        )}
      </PropLine>
      {open === 'mood' && (
        <FadeInView className="pb-2 pl-1 md:max-w-[360px]">
          <MoodSelector
            value={mood}
            onChange={(m) => {
              onMoodChange(m);
              setOpen(null);
            }}
          />
        </FadeInView>
      )}

      <PropLine icon="Tag" label="Tags" onPress={() => toggle('tags')} active={open === 'tags'}>
        {tags.length ? (
          <View className="flex-row flex-wrap gap-1.5">
            {tags.map((t) => (
              <View key={t} className="rounded-md bg-[rgba(20,184,166,0.12)] px-2 py-0.5">
                <Text variant="body" className="text-[12.5px] font-medium" style={{ color: theme.brand.tideTeal }}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          empty('Add tags')
        )}
      </PropLine>
      {open === 'tags' && (
        <FadeInView className="pb-2 pl-1">
          <InterestTags value={tags} onChange={onTagsChange} />
        </FadeInView>
      )}

      <PropLine icon="Image" label="Photos" onPress={() => toggle('photos')} active={open === 'photos'}>
        {photoUris.length ? (
          <Text variant="body" color="secondary" className="text-[14px]">
            {photoUris.length} {photoUris.length === 1 ? 'photo' : 'photos'}
          </Text>
        ) : (
          empty('Add photos')
        )}
      </PropLine>
      {open === 'photos' && (
        <FadeInView className="pb-2 pl-1">
          <JournalPhotoPicker photoUris={photoUris} onChange={onPhotosChange} />
        </FadeInView>
      )}

      <PropLine icon="Clock" label="Created">
        <Text variant="body" color="secondary" className="text-[14px]">
          {formatMonthDayYear(createdAt)} · {formatTime(createdAt)}
        </Text>
      </PropLine>
    </View>
  );
}

function PropLine({ icon, label, children, onPress, active }: { icon: IconName; label: string; children: ReactNode; onPress?: () => void; active?: boolean }) {
  const theme = useThemeColors();
  const body = (
    <View className="min-h-[34px] flex-row items-center">
      <View className="w-[104px] flex-row items-center gap-2">
        <Icon name={icon} size={15} color={theme.text.muted} />
        <Text variant="body" color="muted" className="text-[13.5px]">
          {label}
        </Text>
      </View>
      <View className="flex-1" style={{ minWidth: 0 }}>
        {children}
      </View>
    </View>
  );
  if (!onPress) return <View className="px-2">{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${label.toLowerCase()}`}
      className={active ? 'rounded-lg bg-[rgba(100,116,139,0.10)] px-2' : 'rounded-lg px-2 hover:bg-[rgba(100,116,139,0.08)]'}
    >
      {body}
    </Pressable>
  );
}

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { JournalPreview } from '../../types/dashboard';
import { Badge, Text } from '../ui';

export interface RecentJournalProps {
  entries: JournalPreview[];
}

export function RecentJournal({ entries }: RecentJournalProps) {
  return (
    <View className="rounded-2xl border border-subtle bg-base p-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text variant="h3" color="primary">
          Recent Reflections
        </Text>
        <Pressable onPress={() => router.push('/journal')} hitSlop={8}>
          <Text variant="body" color="accent" className="font-medium">
            View all
          </Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-4">
        {entries.map((entry) => (
          <View
            key={entry.id}
            className="basis-full gap-2 rounded-xl border border-subtle bg-surface p-4 sm:basis-[31%]"
          >
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {entry.date}
            </Text>
            <Text variant="body-lg" color="primary" className="font-semibold">
              {entry.title}
            </Text>
            <Text variant="body" color="secondary" numberOfLines={2}>
              {entry.preview}
            </Text>

            <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
              {entry.mood && <Badge label={entry.mood} variant="teal" size="sm" />}
              {entry.tags.map((tag) => (
                <Badge key={tag} label={tag} variant="default" size="sm" />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

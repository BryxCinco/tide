import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLayout } from '@/components/layout';
import { JournalEditor } from '@/components/journal';
import { BackButton, EmptyState, ResponsiveContainer, Text } from '@/components/ui';
import { useJournalStore } from '@/store/journalStore';

export default function JournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entries = useJournalStore((s) => s.entries);
  const entry = entries.find((e) => e.id === id);

  return (
    <AppLayout showMobileMenuButton={false}>
      <SafeAreaView className="flex-1 bg-base">
        <ResponsiveContainer className="flex-1 py-4 md:py-6 lg:py-8">
          {entry ? (
            <JournalEditor entry={entry} onDone={() => router.back()} />
          ) : (
            <View className="flex-1 gap-5">
              <View className="flex-row items-center gap-3">
                <BackButton onPress={() => router.back()} />
                <Text variant="h2" color="primary" className="flex-1">
                  Entry
                </Text>
              </View>
              <EmptyState icon="BookOpen" title="Entry not found" description="It may have been deleted." />
            </View>
          )}
        </ResponsiveContainer>
      </SafeAreaView>
    </AppLayout>
  );
}

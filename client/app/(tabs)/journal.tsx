import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton, EmptyState, ResponsiveContainer, Text } from '@/components/ui';

// Placeholder — a later phase builds the real Journal screen.
export default function JournalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <ResponsiveContainer className="flex-row items-center gap-3 py-4 md:py-6 lg:py-8">
        <BackButton onPress={() => router.push('/')} />
        <Text variant="h3" color="primary">
          Journal
        </Text>
      </ResponsiveContainer>
      <EmptyState icon="Book" title="Journal" description="Coming soon — write and revisit your reflections here." />
    </SafeAreaView>
  );
}

import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLayout } from '@/components/layout';
import { JournalEditor } from '@/components/journal';
import { ResponsiveContainer } from '@/components/ui';

export default function NewJournalEntryScreen() {
  return (
    <AppLayout showMobileMenuButton={false}>
      <SafeAreaView className="flex-1 bg-base">
        <ResponsiveContainer className="flex-1 py-4 md:py-6 lg:py-8">
          <JournalEditor onDone={() => router.back()} />
        </ResponsiveContainer>
      </SafeAreaView>
    </AppLayout>
  );
}

import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';

// Placeholder — a later phase builds the real Journal screen.
export default function JournalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <EmptyState icon="Book" title="Journal" description="Coming soon — write and revisit your reflections here." />
    </SafeAreaView>
  );
}

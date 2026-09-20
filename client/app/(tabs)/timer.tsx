import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';

// Placeholder — Phase 5 builds the real Timer screen.
export default function TimerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <EmptyState icon="Clock" title="Timer" description="Coming soon — track your focus sessions here." />
    </SafeAreaView>
  );
}

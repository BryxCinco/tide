import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';

// Placeholder — a later phase builds the real Insights screen.
export default function InsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <EmptyState icon="BarChart3" title="Insights" description="Coming soon — trends across your time and mood." />
    </SafeAreaView>
  );
}

import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton, EmptyState, ResponsiveContainer, Text } from '@/components/ui';

// Placeholder — a later phase builds the real Insights screen.
export default function InsightsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-base">
      <ResponsiveContainer className="flex-row items-center gap-3 py-4 md:py-6 lg:py-8">
        <BackButton onPress={() => router.push('/')} />
        <Text variant="h3" color="primary">
          Insights
        </Text>
      </ResponsiveContainer>
      <EmptyState icon="BarChart3" title="Insights" description="Coming soon — trends across your time and mood." />
    </SafeAreaView>
  );
}

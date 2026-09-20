import { Stack } from 'expo-router';

// Placeholder shell for the authenticated app — Phase 4 replaces this with the real Tabs navigator.
export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

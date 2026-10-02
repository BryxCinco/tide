import { Stack } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Nested stack for /journal/new and /journal/[id] — kept separate from the (tabs) group
 * since the editor is a full-screen push, not a tab. */
export default function JournalStackLayout() {
  const themeColors = useThemeColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themeColors.background.base } }} />;
}

import { Stack } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';

/** Nested stack for /legal/privacy and /legal/terms — same reasoning as journal/_layout.tsx:
 * full-screen pushes, kept out of the (tabs) group. */
export default function LegalStackLayout() {
  const themeColors = useThemeColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themeColors.background.base } }} />;
}

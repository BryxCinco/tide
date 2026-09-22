import { Stack } from 'expo-router';

/** Nested stack for /legal/privacy and /legal/terms — same reasoning as journal/_layout.tsx:
 * full-screen pushes, kept out of the (tabs) group. */
export default function LegalStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}

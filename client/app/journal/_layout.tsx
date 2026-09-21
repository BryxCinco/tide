import { Stack } from 'expo-router';

/** Nested stack for /journal/new and /journal/[id] — kept separate from the (tabs) group
 * since the editor is a full-screen push, not a tab. */
export default function JournalStackLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}

import { Stack } from 'expo-router';

import { useThemeColors } from '@/hooks/useThemeColors';

export default function AuthLayout() {
  const themeColors = useThemeColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: themeColors.background.base } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="link-account" />
    </Stack>
  );
}

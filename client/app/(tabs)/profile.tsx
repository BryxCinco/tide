import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, BackButton, Button, ResponsiveContainer, Text, ThemeToggle } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

// Placeholder — a later phase builds the real Profile/Settings screen.
// Keeps logout reachable now that the dashboard itself is the real thing (it used to live there as a placeholder).
export default function ProfileScreen() {
  const { user, isGuest, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ResponsiveContainer className="flex-row items-center gap-3 py-4 md:py-6 lg:py-8">
        <BackButton onPress={() => router.push('/')} />
        <Text variant="h3" color="primary">
          Profile
        </Text>
      </ResponsiveContainer>

      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Avatar name={user?.name} source={user?.avatar} size="xl" />
        <Text variant="h2" color="primary" className="mt-2">
          {user?.name ?? 'Guest'}
        </Text>
        <Text variant="body" color="muted" className="mb-2 text-center">
          {isGuest ? 'Guest session — full profile settings coming soon.' : user?.email}
        </Text>

        <View className="mb-4 flex-row items-center gap-3 rounded-xl border border-subtle bg-elevated px-4 py-3">
          <Text variant="body" color="secondary" className="font-medium">
            Dark Mode
          </Text>
          <ThemeToggle />
        </View>

        <Button title="Log out" variant="secondary" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

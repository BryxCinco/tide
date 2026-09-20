import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Button, Text } from '@/components/ui';
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
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Avatar name={user?.name} source={user?.avatar} size="xl" />
        <Text variant="h2" color="primary" className="mt-2">
          {user?.name ?? 'Guest'}
        </Text>
        <Text variant="body" color="muted" className="mb-6 text-center">
          {isGuest ? 'Guest session — full profile settings coming soon.' : user?.email}
        </Text>
        <Button title="Log out" variant="secondary" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

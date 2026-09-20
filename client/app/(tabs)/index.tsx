import { router } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, GuestBanner, Text } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

// Placeholder dashboard — proves the auth redirect flow end-to-end. Phase 4 replaces this screen.
export default function DashboardPlaceholder() {
  const { user, isGuest, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      {isGuest && (
        <View className="px-4 pt-4">
          <GuestBanner onLinkPress={() => router.push('/(auth)/link-account')} />
        </View>
      )}

      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text variant="h2" color="primary">
          Welcome, {user?.name ?? 'friend'}
        </Text>
        <Text variant="body" color="muted" className="mb-6 text-center">
          {isGuest ? 'Guest session' : user?.email} — the real dashboard lands in Phase 4.
        </Text>
        <Button title="Log out" variant="secondary" onPress={handleLogout} />
      </View>
    </SafeAreaView>
  );
}

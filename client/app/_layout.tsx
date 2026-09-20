import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const restoreSession = useAuthStore((s) => s.restoreSession);
  const [isRestoring, setIsRestoring] = useState(true);

  // Deliberately not authStore's `isLoading` here — that flag also drives the
  // Sign In / Create Account button spinners, and reusing it for this gate
  // would unmount the login/register screen under a full-screen Loader every
  // time a login/register call is in flight.
  useEffect(() => {
    restoreSession().finally(() => setIsRestoring(false));
  }, [restoreSession]);

  useEffect(() => {
    if (fontsLoaded && !isRestoring) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isRestoring]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-base">
        {isRestoring ? <Loader fullScreen /> : <RootNavigator />}
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isGuest } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>

      {/*
        Guests are `isAuthenticated: true` (they can use the app), but still need
        the (auth) group for /link-account. Guarding on `!isAuthenticated || isGuest`
        keeps login/register unreachable for real accounts (unchanged behavior) while
        letting guests back into the group — link-account.tsx is the only screen a
        guest has a reason to open here, but a guest bouncing to login/register too
        is harmless (they'd just be switching accounts instead of linking).
      */}
      <Stack.Protected guard={!isAuthenticated || isGuest}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Always reachable regardless of auth state — dev-only component gallery. */}
      <Stack.Screen name="test" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

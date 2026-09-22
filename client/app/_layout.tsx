import '../global.css';
import '@/utils/nativewindInterop';

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
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatPanel } from '@/components/chat';
import { SearchModal } from '@/components/search';
import { Loader } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useUiStore } from '@/store/uiStore';
import { colors, darkColors } from '@/utils/theme';
import { darkVars, lightVars } from '@/utils/themeVars';

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
  const theme = useThemeStore((s) => s.theme);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* The `vars()` style is what actually re-themes the app — every bg-base/
            text-primary/border-subtle className below this node resolves against
            whichever CSS custom properties are applied here (see themeVars.ts). */}
        <View className="flex-1 bg-base" style={theme === 'dark' ? darkVars : lightVars}>
          {isRestoring ? <Loader fullScreen /> : <RootNavigator />}
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isAuthenticated, isGuest } = useAuth();
  const theme = useThemeStore((s) => s.theme);
  const backgroundColor = theme === 'dark' ? darkColors.background.base : colors.background.base;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isChatOpen = useUiStore((s) => s.isChatOpen);

  // Cmd+K (Mac) / Ctrl+K (Windows/Linux) — web only, there's no keyboard shortcut
  // equivalent on native. Mounted here (not RootLayout) so it only ever fires once the
  // user is past auth — searching app content from the login screen doesn't make sense.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !isAuthenticated) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor } }}>
        <Stack.Screen name="index" />

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="activities" />
          <Stack.Screen name="tasks" />
          <Stack.Screen name="journal" />
          <Stack.Screen name="chat" />
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

      {isAuthenticated && <SearchModal visible={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
      {/* Mounted only while open (not always-mounted + a `visible` prop) — matches
          MobileDrawer's convention: no animated exit, just an instant unmount, with the
          entrance slide-in handled inside ChatPanel itself. */}
      {isAuthenticated && isChatOpen && <ChatPanel />}
    </>
  );
}

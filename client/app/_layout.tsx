// Must load before anything that imports '@/lib/supabase' (supabase-js needs a spec-compliant
// global `URL`, which Hermes doesn't provide) — kept as the very first import so its
// side-effecting polyfill install always runs first regardless of import-order elsewhere.
import 'react-native-url-polyfill/auto';

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

import { OAuthCallbackScreen } from '@/components/auth';
import { ChatPanel } from '@/components/chat';
import { SearchModal } from '@/components/search';
import { Loader, OfflineBanner, Toast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useUiStore } from '@/store/uiStore';
import { colors, darkColors } from '@/utils/theme';
import { darkVars, lightVars } from '@/utils/themeVars';

SplashScreen.preventAutoHideAsync();

/** True only on web, only when the URL still carries `?code=`/`?error=`/`?error_description=`
 * from a Google OAuth redirect — this is what used to be a blank, stuck page (see
 * OAuthCallbackScreen's own comment for the full mechanism). Computed once via a lazy
 * useState initializer, not re-checked on every render — the URL gets cleaned up once the
 * callback resolves, so re-reading it later would just see it's gone and doesn't need to. */
function hasOAuthCallbackParams(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error') || params.has('error_description');
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const restoreSession = useAuthStore((s) => s.restoreSession);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isOAuthCallback, setIsOAuthCallback] = useState(hasOAuthCallbackParams);
  const theme = useThemeStore((s) => s.theme);

  // Deliberately not authStore's `isLoading` here — that flag also drives the
  // Sign In / Create Account button spinners, and reusing it for this gate
  // would unmount the login/register screen under a full-screen Loader every
  // time a login/register call is in flight.
  //
  // Skipped entirely while handling an OAuth callback: restoreSession() optimistically
  // sets isAuthenticated=true the moment it finds ANY cached token, before verifying it —
  // if a stale/expired one happens to be sitting in storage from a previous session, that
  // false-positive isAuthenticated flip is indistinguishable, from OAuthCallbackScreen's
  // point of view, from the real Google sign-in actually completing. That was the root
  // cause of the redirect-loop bug: it resolved the callback screen (and wiped the `?code=`
  // from the URL) off a stale cached session, which then failed its own background
  // verification a few seconds later and bounced back to login — nothing to do with the
  // Google flow at all, which was often still in progress. There's nothing to "restore"
  // here anyway: completeGoogleSignIn (googleAuth.service.ts's listener) establishes a
  // fresh, real session once the callback actually resolves.
  useEffect(() => {
    if (isOAuthCallback) {
      console.log('[OAuth Debug] Skipping restoreSession() while handling an OAuth callback.');
      setIsRestoring(false);
      return;
    }
    restoreSession().finally(() => setIsRestoring(false));
  }, [isOAuthCallback, restoreSession]);

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
          <OfflineBanner />
          {isOAuthCallback ? (
            <OAuthCallbackScreen onResolved={() => setIsOAuthCallback(false)} />
          ) : isRestoring ? (
            <Loader fullScreen />
          ) : (
            <RootNavigator />
          )}
          {/* Always mounted, not gated by auth — a toast fired right before/during a
              redirect (e.g. "Account deleted" just ahead of the /login replace) should
              still be visible to land. */}
          <Toast />
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
          <Stack.Screen name="legal" />
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

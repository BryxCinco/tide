import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { useAuthStore } from '../../store/authStore';
import { Button, Loader, Text } from '../ui';

const TIMEOUT_MS = 10000;

export interface OAuthCallbackScreenProps {
  /** Tells app/_layout.tsx to stop rendering this and go back to the normal navigator —
   * called on both success and give-up, never leaving this screen up once the URL's
   * `?code=`/`?error=` has actually been dealt with one way or another. */
  onResolved: () => void;
}

/** Removes `?code=...`/`?error=...` from the address bar — supabase-js's own
 * detectSessionInUrl likely already does this after a successful exchange, but this is a
 * cheap backstop for the error/timeout paths, where it wouldn't have. No-op on native,
 * where there's no address bar carrying query params to begin with. */
function cleanUrl(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

/**
 * Rendered by app/_layout.tsx instead of the normal app, for as long as the current URL
 * still carries `?code=`/`?error=` from a Google OAuth redirect (web only — see that
 * file's `hasOAuthCallbackParams`). The actual code-exchange-into-a-session work happens
 * on its own, outside of anything this component does directly (lib/supabase.ts's
 * `detectSessionInUrl` + authStore's `completeGoogleSignIn`, wired together in
 * googleAuth.service.ts's module-scope listener) — this screen's only job is to show
 * *something* other than a blank, stuck page while that finishes, and to fail loudly with
 * a way back instead of hanging forever if it doesn't.
 */
export function OAuthCallbackScreen({ onResolved }: OAuthCallbackScreenProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    console.log('[OAuth Debug] OAuthCallbackScreen mounted.');
  }, []);

  useEffect(() => {
    console.log('[OAuth Debug] OAuthCallbackScreen sees isAuthenticated =', isAuthenticated);
    if (!isAuthenticated) return;
    console.log('[OAuth Debug] Resolving OAuthCallbackScreen — isAuthenticated is true.');
    cleanUrl();
    onResolved();
    // onResolved is a fresh closure on every render (app/_layout.tsx's setState setter is
    // stable, but the arrow function wrapping it isn't) — safe to omit, it doesn't change
    // what this effect does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[OAuth Debug] OAuthCallbackScreen timed out after', TIMEOUT_MS, 'ms with no session.');
      setTimedOut(true);
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleBackToLogin = () => {
    console.log('[OAuth Debug] User clicked "Back to Login" — navigating away from OAuthCallbackScreen.');
    clearError();
    cleanUrl();
    onResolved();
    router.replace('/(auth)/login');
  };

  if (error || timedOut) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-base px-8">
        <Text variant="h2" color="primary" className="text-center">
          Sign-in didn&apos;t complete
        </Text>
        <Text variant="body" color="muted" className="text-center">
          {error ?? "This is taking longer than expected — the connection may have dropped."}
        </Text>
        <Button title="Back to Login" variant="primary" onPress={handleBackToLogin} className="mt-2" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-base">
      <Loader size="lg" />
      <Text variant="body" color="muted">
        Signing you in...
      </Text>
    </View>
  );
}

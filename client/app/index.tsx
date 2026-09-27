import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

// Auth gate: "/" always resolves here first, then hands off based on session state.
export default function Index() {
  const { isAuthenticated } = useAuth();
  // TEMPORARY — remove once the OAuth redirect-loop bug is confirmed fixed.
  console.log('[OAuth Debug] app/index.tsx redirecting based on isAuthenticated =', isAuthenticated, '-> ', isAuthenticated ? '/(tabs)' : '/(auth)/login');
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}

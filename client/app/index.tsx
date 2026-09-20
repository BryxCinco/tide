import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

// Auth gate: "/" always resolves here first, then hands off based on session state.
export default function Index() {
  const { isAuthenticated } = useAuth();
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}

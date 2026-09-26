import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** True until proven otherwise — NetInfo's first callback can take a moment, and assuming
 * "online" avoids flashing an offline banner on every cold start. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` is null until NetInfo has actually verified reachability
      // (not just "connected to a network") — treat unknown as online rather than
      // flickering the banner on every check.
      setIsOnline(state.isInternetReachable ?? state.isConnected ?? true);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}

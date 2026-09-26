import { Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Icon } from './Icon';

/**
 * Thin bar fixed to the top of the screen whenever the device has no network connectivity.
 * Mounted once at the root (app/_layout.tsx, before RootNavigator, same pattern as Toast)
 * rather than duplicated per-screen — "offline" is an app-wide condition, not a per-screen
 * one, and every store's cached/persisted data is still shown underneath (see each store's
 * persist middleware). Sits in normal flow (not `position: absolute`) so it pushes screen
 * content down instead of overlapping it, and pads for the safe-area top inset itself since
 * it renders outside every screen's own SafeAreaView.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View pointerEvents="none" className="items-center bg-warning px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2">
        <Icon name="WifiOff" size={14} color="#FFFFFF" />
        <RNText className="text-caption font-semibold text-white">You&apos;re offline — showing your last saved data</RNText>
      </View>
    </View>
  );
}

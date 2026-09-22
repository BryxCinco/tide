import { useState } from 'react';
import { Text as RNText, View } from 'react-native';
import { Pressable } from './SoundPressable';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon } from './Icon';

export interface GuestBannerProps {
  /** Called when "Save Progress" is pressed — typically navigates to /link-account. */
  onLinkPress: () => void;
  className?: string;
}

/** Shown on authenticated screens while the current session is a guest. Dismissible per-mount. */
export function GuestBanner({ onLinkPress, className }: GuestBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <View
      className={cn(
        'flex-row items-start gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3',
        className,
      )}
    >
      <Icon name="UserCircle" size={18} color={colors.brand.tideTeal} />

      <View className="flex-1">
        <RNText className="text-body text-secondary">
          You&apos;re using TIDE as a guest. Your data is saved on this device only.
        </RNText>
        <Pressable onPress={onLinkPress} hitSlop={8} className="mt-1 self-start">
          <RNText className="text-body font-medium text-tide-teal">Save Progress</RNText>
        </Pressable>
      </View>

      <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
        <Icon name="X" size={16} />
      </Pressable>
    </View>
  );
}

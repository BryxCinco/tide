import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { Text } from './Text';

export interface TooltipProps {
  label: string;
  /** Controlled by the caller (usually onHoverIn/onHoverOut on the wrapped Pressable) —
   * Tooltip doesn't track hover itself since the trigger already needs those handlers. */
  visible: boolean;
  children: ReactNode;
}

/** Floating label anchored to the right of its trigger — used by the collapsed sidebar
 * rail, where icons alone aren't enough to identify a destination. */
export function Tooltip({ label, visible, children }: TooltipProps) {
  const themeColors = useThemeColors();

  return (
    <View className="relative items-center justify-center">
      {children}
      {visible && (
        <View
          className="absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 rounded-md px-2.5 py-1.5"
          style={{ backgroundColor: themeColors.text.primary }}
          pointerEvents="none"
        >
          <Text variant="caption" color="inverse" className="normal-case tracking-normal" numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

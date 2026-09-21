import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Modal as RNModal, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useResponsive } from '../../hooks/useResponsive';
import { cn } from '../../utils/cn';
import { colors, shadows } from '../../utils/theme';
import { Icon } from './Icon';
import { Text } from './Text';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max width when centered (tablet/desktop) / content height on phone. Defaults to `md`. */
  size?: ModalSize;
}

/**
 * Bottom-sheet on phone, centered on tablet/desktop — driven by viewport width (useResponsive),
 * not Platform.OS, so a wide browser window and a native tablet both get the centered
 * treatment, and a narrow/mobile browser gets the same bottom sheet a phone app would.
 */
export function Modal({ visible, onClose, title, children, size = 'md' }: ModalProps) {
  const { isPhone, isTablet } = useResponsive();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const contentStyle = useAnimatedStyle(() => {
    if (isPhone) {
      return {
        opacity: progress.value,
        transform: [{ translateY: (1 - progress.value) * 48 }],
      };
    }
    return {
      opacity: progress.value,
      transform: [{ scale: 0.95 + progress.value * 0.05 }],
    };
  });

  if (!visible) {
    return null;
  }

  const isFull = size === 'full';

  // 'md' is the width real forms use (ActivityFormModal, TaskFormModal) — tied directly to
  // the tablet/desktop numbers from the spec. 'sm' (confirm dialogs) and 'lg' keep fixed
  // widths; there's no current use of 'lg' to tune against, so it isn't tiered.
  const centeredWidthClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: isTablet ? 'max-w-[500px]' : 'max-w-[600px]',
    lg: 'max-w-lg',
    full: 'h-full w-full',
  };

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className={cn('flex-1', isPhone ? 'justify-end' : 'items-center justify-center p-4')}>
        <Animated.View
          style={[{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)' }, backdropStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={contentStyle} className={isPhone ? undefined : cn('w-full', centeredWidthClasses[size])}>
          <View
            className={cn(
              'overflow-hidden border border-glass bg-surface',
              isPhone ? (isFull ? '' : 'rounded-t-2xl') : 'rounded-2xl',
              isFull && 'h-full w-full',
            )}
            style={shadows.lg}
          >
            {title && (
              <View className="flex-row items-center justify-between border-b border-subtle px-4 py-3">
                <Text variant="h3" color="primary">
                  {title}
                </Text>
                <Pressable onPress={onClose} hitSlop={8}>
                  <Icon name="X" size={20} color={colors.text.muted} />
                </Pressable>
              </View>
            )}
            <View className="p-4">{children}</View>
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}

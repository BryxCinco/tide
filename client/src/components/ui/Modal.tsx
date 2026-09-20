import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Modal as RNModal, Platform, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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
  /** Max width on web / content height on mobile. Defaults to `md`. */
  size?: ModalSize;
}

const webSizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'h-full w-full',
};

/**
 * Centered-with-scale on web, slide-up-from-bottom on mobile. Backdrop tap closes it.
 */
export function Modal({ visible, onClose, title, children, size = 'md' }: ModalProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const contentStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') {
      return {
        opacity: progress.value,
        transform: [{ scale: 0.95 + progress.value * 0.05 }],
      };
    }
    return {
      opacity: progress.value,
      transform: [{ translateY: (1 - progress.value) * 48 }],
    };
  });

  if (!visible) {
    return null;
  }

  const isFull = size === 'full';

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className={cn('flex-1', Platform.OS === 'web' ? 'items-center justify-center p-4' : 'justify-end')}>
        <Animated.View
          style={[{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)' }, backdropStyle]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={contentStyle} className={Platform.OS === 'web' ? cn('w-full', webSizeClasses[size]) : undefined}>
          <View
            className={cn(
              'overflow-hidden border border-glass bg-surface',
              Platform.OS === 'web' ? 'rounded-2xl' : isFull ? '' : 'rounded-t-2xl',
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

import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Pressable } from './SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import { gradientDirections, gradients } from '../../utils/gradients';
import { Icon, type IconName } from './Icon';

export interface FABProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * Bottom-right aurora floating action button — 56px on phone, 60px on tablet/desktop. It
 * sits still (no idle float loop) and only squashes slightly on press. The shadow lives on
 * a round wrapper so it renders as a soft circle, not a square halo.
 */
export function FAB({ icon, onPress, accessibilityLabel }: FABProps) {
  const { isPhone } = useResponsive();
  const size = isPhone ? 56 : 60;

  return (
    <View
      style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: size,
        height: size,
        borderRadius: size / 2,
        shadowColor: '#06B6D4',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <LinearGradient
          colors={[...gradients.aurora]}
          {...gradientDirections.diagonal}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <View>
            <Icon name={icon} size={26} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

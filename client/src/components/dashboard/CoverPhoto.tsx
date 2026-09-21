import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { COVER_GRADIENTS, DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import type { CoverType } from '../../types/user';
import { shadows } from '../../utils/theme';
import { Icon } from '../ui';

export interface CoverPhotoProps {
  coverType: CoverType;
  coverValue: string;
  height: number;
  onPress: () => void;
}

/** Full-width banner — gradient preset, solid color, or an uploaded image. Tapping opens
 * CoverPicker (see ProfileHeader, which owns that modal's visibility). The camera badge
 * is its own nested Pressable (rather than relying on the cover's own tap) so it can carry
 * independent hover feedback — top-right keeps it clear of the avatar, which overlaps the
 * cover's bottom-left edge. */
export function CoverPhoto({ coverType, coverValue, height, onPress }: CoverPhotoProps) {
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const { isPhone } = useResponsive();
  const [cameraHovered, setCameraHovered] = useState(false);
  const gradient = COVER_GRADIENTS.find((g) => g.id === coverValue) ?? COVER_GRADIENTS[0];
  const cameraSize = isPhone ? 36 : 40;

  return (
    <View style={{ height }} className="w-full overflow-hidden rounded-b-3xl">
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        {coverType === 'image' && coverValue ? (
          <Image source={{ uri: coverValue }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : coverType === 'solid' ? (
          <View style={{ flex: 1, backgroundColor: coverValue || themeColors.brand.tideTeal }} />
        ) : (
          <LinearGradient
            colors={gradient?.colors ?? COVER_GRADIENTS[0].colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        )}
      </Pressable>

      <Pressable
        onPress={onPress}
        onHoverIn={() => setCameraHovered(true)}
        onHoverOut={() => setCameraHovered(false)}
        className="absolute right-4 top-4 items-center justify-center rounded-full"
        style={[
          {
            width: cameraSize,
            height: cameraSize,
            zIndex: 10,
            backgroundColor: cameraHovered
              ? themeColors.brand.tideTeal
              : isDark
                ? themeColors.background.elevated
                : '#FFFFFF',
            transform: [{ scale: cameraHovered ? 1.05 : 1 }],
          },
          shadows.sm,
        ]}
      >
        <Icon name="Camera" size={18} color={cameraHovered ? '#FFFFFF' : themeColors.text.primary} />
      </Pressable>
    </View>
  );
}

export { DEFAULT_COVER_GRADIENT_ID };

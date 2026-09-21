import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { COVER_GRADIENTS, DEFAULT_COVER_GRADIENT_ID } from '../../store/userStore';
import type { CoverType } from '../../types/user';
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
    // position: 'relative' is RN's default for every View anyway, but set explicitly so
    // the camera button's `position: 'absolute'` below is unambiguously anchored here.
    <View style={{ height, position: 'relative' }} className="w-full overflow-hidden rounded-b-3xl">
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

      {/* No `left`, no flexDirection — plain absolute top-right, sized 40/36 desktop/mobile. */}
      <Pressable
        onPress={onPress}
        onHoverIn={() => setCameraHovered(true)}
        onHoverOut={() => setCameraHovered(false)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: cameraSize,
          height: cameraSize,
          borderRadius: cameraSize / 2,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
          // 'white' unconditionally (as a literal, theme-blind value) would look flat
          // against a dark-mode elevated surface — kept theme-reactive instead, same
          // background pairing used everywhere else in the app (bg-elevated in dark).
          backgroundColor: cameraHovered
            ? themeColors.brand.tideTeal
            : isDark
              ? themeColors.background.elevated
              : '#FFFFFF',
          transform: [{ scale: cameraHovered ? 1.05 : 1 }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Icon name="Camera" size={18} color={cameraHovered ? '#FFFFFF' : themeColors.text.primary} />
      </Pressable>
    </View>
  );
}

export { DEFAULT_COVER_GRADIENT_ID };

import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { measureInWindow } from '../../utils/measure';
import { revealThemeChange } from '../../utils/themeTransition';
import { Icon } from './Icon';
import { Tooltip } from './Tooltip';

const WIDTH = 56;
const HEIGHT = 28;
const PADDING = 3;
const THUMB_SIZE = HEIGHT - PADDING * 2;
const TRAVEL = WIDTH - THUMB_SIZE - PADDING * 2;
const COLLAPSED_SIZE = 36;

export interface AnimatedThemeToggleProps {
  className?: string;
  /** Compact single-icon circular button (for the collapsed sidebar rail) instead of the
   * full Sun/Moon pill — same tap behavior, just sized to match the other rail icons. */
  collapsed?: boolean;
}

/**
 * On web, measures its own on-screen position (via measureInWindow — see utils/measure.ts
 * for why that's used instead of the press event's pageX/pageY) and hands it to
 * revealThemeChange (see utils/themeTransition.ts), which drives a circular reveal
 * through the browser's own CSS View Transitions API rather than a hand-rolled overlay.
 * Native has no such API, so it just swaps the theme instantly.
 */
export function AnimatedThemeToggle({ className, collapsed = false }: AnimatedThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const themeColors = useThemeColors();
  const isDark = theme === 'dark';
  const pressableRef = useRef<View>(null);
  const [isHovered, setIsHovered] = useState(false);

  const progress = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isDark ? 1 : 0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [isDark, progress]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  const handlePress = async () => {
    const target = isDark ? 'light' : 'dark';

    if (Platform.OS !== 'web') {
      setTheme(target);
      return;
    }

    const { x, y, width, height } = await measureInWindow(pressableRef);
    revealThemeChange({ clientX: x + width / 2, clientY: y + height / 2 }, () => setTheme(target));
  };

  if (collapsed) {
    return (
      <Tooltip label={isDark ? 'Switch to Light' : 'Switch to Dark'} visible={isHovered}>
        <Pressable
          ref={pressableRef}
          onPress={handlePress}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          className={className}
          style={{
            width: COLLAPSED_SIZE,
            height: COLLAPSED_SIZE,
            borderRadius: COLLAPSED_SIZE / 2,
            borderWidth: 1,
            borderColor: themeColors.border.subtle,
            backgroundColor: themeColors.background.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={isDark ? 'Moon' : 'Sun'} size={16} color={themeColors.brand.tideTeal} />
        </Pressable>
      </Tooltip>
    );
  }

  return (
    <Pressable
      ref={pressableRef}
      onPress={handlePress}
      className={className}
      style={{
        width: WIDTH,
        height: HEIGHT,
        borderRadius: HEIGHT / 2,
        backgroundColor: themeColors.background.hover,
        borderWidth: 1,
        borderColor: themeColors.border.subtle,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: PADDING,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: themeColors.brand.tideTeal,
          },
          thumbStyle,
        ]}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: PADDING + 4,
        }}
      >
        <Icon name="Sun" size={13} color={!isDark ? themeColors.text.inverse : themeColors.text.disabled} />
        <Icon name="Moon" size={13} color={isDark ? themeColors.text.inverse : themeColors.text.disabled} />
      </View>
    </Pressable>
  );
}

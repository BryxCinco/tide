import { Pressable } from '../ui/SoundPressable';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useThemeColors } from '../../hooks/useThemeColors';

const WIDTH = 44;
const HEIGHT = 24;
const PADDING = 2;
const THUMB_SIZE = HEIGHT - PADDING * 2;
const TRAVEL = WIDTH - THUMB_SIZE - PADDING * 2;

export interface SettingsSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** For a sub-setting whose parent toggle is off (e.g. Typing Sounds under Sound Effects)
   * — the row itself dims via SettingsItem's own `disabled` prop, but that only affects
   * SettingsItem's Pressable wrapper, not this independently-interactive switch, so it
   * needs its own disabled handling to actually block the press. */
  disabled?: boolean;
}

/** Compact teal-when-on/gray-when-off toggle for boolean preference rows (Notifications,
 * Sound Effects) — same pill+sliding-thumb shape as AnimatedThemeToggle, just without the
 * Sun/Moon icons or the circular-reveal press behavior that toggle uses for theme specifically. */
export function SettingsSwitch({ value, onValueChange, disabled = false }: SettingsSwitchProps) {
  const themeColors = useThemeColors();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [themeColors.background.hover, themeColors.brand.tideTeal],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
    >
      <Animated.View
        style={[
          { width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: PADDING, justifyContent: 'center', opacity: disabled ? 0.5 : 1 },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2, backgroundColor: '#FFFFFF' }, thumbStyle]}
        />
      </Animated.View>
    </Pressable>
  );
}

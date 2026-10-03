import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { DayTimeEntry } from '../../types/insights';
import { formatDuration } from '../../utils/formatTime';
import { Text } from '../ui';

export interface TimeChartProps {
  data: DayTimeEntry[];
  height?: number;
}

const BAR_ANIM_DURATION = 500;

/**
 * Bar chart built from plain Views + LinearGradient rather than victory-native — see the
 * chat explanation: victory-native v42 requires @shopify/react-native-skia, whose web
 * story (CanvasKit WASM) isn't something this RN-Web-first app should take on for a bar
 * chart. Bars are flex-basis columns so the chart reflows at any width without needing
 * an SVG viewBox/onLayout dance.
 */
export function TimeChart({ data, height = 130 }: TimeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxSeconds = Math.max(...data.map((d) => d.seconds), 1);

  // A fixed 8px gap between every bar (RN `gap` reserves that space before any bar gets
  // width) is fine for a week/month of bars, but a 62-point Custom range would burn ~488px
  // of pure gap on a phone-width card before any bar renders — shrink the gap as the
  // point count grows so bars stay the majority of the available width at any range.
  const gap = data.length > 20 ? 1 : data.length > 10 ? 2 : 4;
  // Thin the x-axis labels the same way MoodTrend.tsx does — one label per bar overlaps
  // into an unreadable smear well before 62 bars.
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <View>
      <View className="flex-row items-end" style={{ height, gap }}>
        {data.map((entry, index) => (
          <Bar
            key={entry.date}
            entry={entry}
            maxSeconds={maxSeconds}
            containerHeight={height}
            isHovered={hoveredIndex === index}
            onHoverIn={() => setHoveredIndex(index)}
            onHoverOut={() => setHoveredIndex(null)}
            onPress={() => setHoveredIndex((current) => (current === index ? null : index))}
          />
        ))}
      </View>
      <View className="mt-2 flex-row" style={{ gap }}>
        {data.map((entry, index) => (
          <View key={entry.date} className="flex-1 items-center">
            <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={1}>
              {index % labelStep === 0 ? entry.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface BarProps {
  entry: DayTimeEntry;
  maxSeconds: number;
  containerHeight: number;
  isHovered: boolean;
  onHoverIn: () => void;
  onHoverOut: () => void;
  /** Tap-to-toggle fallback for touch devices, which have no hover state at all — without
   * this, the exact per-bar duration (shown in the tooltip below) was unreachable on mobile. */
  onPress: () => void;
}

function Bar({ entry, maxSeconds, containerHeight, isHovered, onHoverIn, onHoverOut, onPress }: BarProps) {
  const themeColors = useThemeColors();
  const targetHeight = Math.max((entry.seconds / maxSeconds) * containerHeight, entry.seconds > 0 ? 6 : 2);
  const heightValue = useSharedValue(0);

  useEffect(() => {
    heightValue.value = withTiming(targetHeight, { duration: BAR_ANIM_DURATION, easing: Easing.out(Easing.cubic) });
  }, [targetHeight, heightValue]);

  const barStyle = useAnimatedStyle(() => ({ height: heightValue.value }));

  return (
    <Pressable
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      onPress={onPress}
      className="flex-1 items-center justify-end"
      style={{ height: containerHeight }}
    >
      {isHovered && (
        <View
          className="absolute -top-8 rounded-md px-2 py-1"
          style={{ backgroundColor: themeColors.text.primary }}
          pointerEvents="none"
        >
          <Text variant="caption" color="inverse" className="normal-case tracking-normal" numberOfLines={1}>
            {formatDuration(entry.seconds)}
          </Text>
        </View>
      )}
      <Animated.View style={[{ width: '70%', borderRadius: 6, overflow: 'hidden' }, barStyle]}>
        <LinearGradient
          colors={isHovered ? [themeColors.brand.tideTealLight, themeColors.brand.tideTeal] : [themeColors.brand.tideTeal, themeColors.brand.tideTealDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Pressable>
  );
}

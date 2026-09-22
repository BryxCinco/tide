import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
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

  return (
    <View>
      <View className="flex-row items-end gap-2" style={{ height }}>
        {data.map((entry, index) => (
          <Bar
            key={entry.date}
            entry={entry}
            maxSeconds={maxSeconds}
            containerHeight={height}
            isHovered={hoveredIndex === index}
            onHoverIn={() => setHoveredIndex(index)}
            onHoverOut={() => setHoveredIndex(null)}
          />
        ))}
      </View>
      <View className="mt-2 flex-row gap-2">
        {data.map((entry) => (
          <View key={entry.date} className="flex-1 items-center">
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {entry.label}
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
}

function Bar({ entry, maxSeconds, containerHeight, isHovered, onHoverIn, onHoverOut }: BarProps) {
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

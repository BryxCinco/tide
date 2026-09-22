import { useEffect, useState } from 'react';
import { Pressable } from '../ui/SoundPressable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { Icon } from '../ui';

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;
const WIDTH_ANIM_DURATION = 250;
const TOGGLE_BUTTON_SIZE = 32;

/**
 * Rendered by AppLayout as a SIBLING of Sidebar and the main content pane — not nested
 * inside Sidebar. React Native Web gives every View a default `position: relative;
 * zIndex: 0`, which makes Sidebar's own root View its own stacking context; a `zIndex`
 * set on a button nested inside that root can never escape to paint above the separate
 * main-content View next to it. In practice that meant the half of this button hanging
 * over the content pane got silently painted over by the content pane's own background —
 * a perfect circle on the inside, sliced off at the sidebar/content boundary. Living at
 * the same level as both fixes it: all three become plain siblings in one shared
 * stacking context, where z-index actually compares.
 *
 * Its `left` position is animated independently (same duration/easing/trigger as
 * Sidebar's own width animation) rather than sharing one literal value — both start from
 * the same `isSidebarCollapsed` state change at the same instant, so they stay in
 * lockstep without needing to lift Sidebar's internal animation state up into AppLayout.
 */
export function SidebarCollapseToggle() {
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const isSidebarCollapsed = useUiStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [hovered, setHovered] = useState(false);

  const left = useSharedValue(isSidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
  const scale = useSharedValue(1);

  useEffect(() => {
    left.value = withTiming(isSidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, {
      duration: WIDTH_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [isSidebarCollapsed, left]);

  const positionStyle = useAnimatedStyle(() => ({ left: left.value - TOGGLE_BUTTON_SIZE / 2 }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const animateScale = (target: number, duration: number) => {
    scale.value = withTiming(target, { duration, easing: Easing.out(Easing.ease) });
  };

  const glowStyle = hovered
    ? {
        shadowColor: themeColors.brand.tideTeal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isDark ? 0.5 : 0.3,
        shadowRadius: 10,
        elevation: 6,
      }
    : undefined;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        { position: 'absolute', top: '50%', marginTop: -TOGGLE_BUTTON_SIZE / 2, zIndex: 50 },
        positionStyle,
      ]}
    >
      <Pressable
        onPress={toggleSidebar}
        onHoverIn={() => {
          setHovered(true);
          animateScale(1.05, 200);
        }}
        onHoverOut={() => {
          setHovered(false);
          animateScale(1, 200);
        }}
        onPressIn={() => animateScale(0.95, 100)}
        onPressOut={() => animateScale(hovered ? 1.05 : 1, 150)}
      >
        <Animated.View
          className="items-center justify-center rounded-full border border-subtle"
          style={[
            {
              width: TOGGLE_BUTTON_SIZE,
              height: TOGGLE_BUTTON_SIZE,
              borderRadius: TOGGLE_BUTTON_SIZE / 2,
              backgroundColor: isDark ? themeColors.background.elevated : themeColors.background.base,
            },
            glowStyle,
            scaleStyle,
          ]}
        >
          <Icon
            name={isSidebarCollapsed ? 'ChevronRight' : 'ChevronLeft'}
            size={16}
            color={hovered ? themeColors.brand.tideTeal : themeColors.text.muted}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

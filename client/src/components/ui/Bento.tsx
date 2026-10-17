import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { gradientDirections, gradients } from '../../utils/gradients';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { Icon, type IconName } from './Icon';
import { Pressable } from './SoundPressable';
import { Text } from './Text';

/**
 * - `surface`: the default white (light) / lifted ink (dark) card.
 * - `ink`: a deep navy tile in BOTH themes — the one "statement" tile per screen. Content
 *   inside must use the light-on-dark colors from `BENTO_INK_TEXT`.
 * - `aurora`: TIDE's teal -> cyan -> indigo gradient, white content.
 * - `glow`: a surface tile with two soft aurora glows in its corners, for a screen's
 *   centerpiece (the timer stage, the journal prompt).
 */
export type BentoTone = 'surface' | 'ink' | 'aurora' | 'glow';

/** Text colors for content placed on `ink` / `aurora` tiles. */
export const BENTO_INK_TEXT = {
  primary: '#F8FAFC',
  secondary: 'rgba(248, 250, 252, 0.78)',
  muted: 'rgba(248, 250, 252, 0.55)',
  hairline: 'rgba(255, 255, 255, 0.1)',
} as const;

export interface BentoTileProps {
  children: ReactNode;
  tone?: BentoTone;
  onPress?: () => void;
  /** Staggers the fade-in — position of the tile on its screen. */
  index?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Accessible label when the tile itself is pressable. */
  accessibilityLabel?: string;
}

const ENTRANCE_STAGGER_MS = 40;

export interface FadeInViewProps {
  children: ReactNode;
  /** Stagger position — each step delays the fade by 40ms (capped). */
  index?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Opacity-only mount fade (no slide), so content never jumps into place. Uses React Native's
 * core Animated API rather than Reanimated: Reanimated's delayed fades could stall part-way on
 * web when the screen re-rendered mid-animation (e.g. data arriving), leaving tiles half-faded.
 */
export function FadeInView({ children, index = 0, className, style }: FadeInViewProps) {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animation = RNAnimated.timing(opacity, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 10) * ENTRANCE_STAGGER_MS,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
    // Mount-only by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className={className} style={style}>
      <RNAnimated.View style={{ flexGrow: 1, opacity }}>{children}</RNAnimated.View>
    </View>
  );
}

/**
 * One tile of a bento layout. Tiles only fade in (no slide), so a screen assembles calmly
 * instead of jumping into place. Layout (spans, rows) is left to the screen via flex
 * classes, which works the same on web and native — unlike CSS grid, which Yoga lacks.
 */
export function BentoTile({ children, tone = 'surface', onPress, index = 0, className, style, accessibilityLabel }: BentoTileProps) {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const toneStyle: ViewStyle =
    tone === 'ink'
      ? { backgroundColor: isDark ? '#111A2B' : '#0B1220', borderColor: 'rgba(255, 255, 255, 0.06)' }
      : tone === 'aurora'
        ? { borderColor: 'transparent' }
        : {};

  const shadow: ViewStyle = {
    shadowColor: tone === 'aurora' ? '#06B6D4' : '#0F172A',
    shadowOffset: { width: 0, height: tone === 'aurora' ? 12 : 4 },
    shadowOpacity: tone === 'aurora' ? 0.25 : isDark ? 0.3 : 0.04,
    shadowRadius: tone === 'aurora' ? 24 : 16,
    elevation: 2,
  };

  const body = (
    <View
      className={cn(
        'flex-1 overflow-hidden rounded-[24px] border p-5',
        (tone === 'surface' || tone === 'glow') && 'border-subtle bg-surface',
        onPress && 'hover:border-tide-teal/40',
      )}
      style={[toneStyle, shadow]}
    >
      {tone === 'aurora' && (
        <LinearGradient colors={[...gradients.aurora]} {...gradientDirections.diagonal} style={FILL} pointerEvents="none" />
      )}
      {tone === 'ink' && (
        <View style={[FILL, { overflow: 'hidden' }]} pointerEvents="none">
          <View style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: hexToRgba('#14B8A6', 0.18) }} />
          <View style={{ position: 'absolute', bottom: -90, left: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: hexToRgba('#6366F1', 0.14) }} />
        </View>
      )}
      {tone === 'glow' && (
        <View style={[FILL, { overflow: 'hidden' }]} pointerEvents="none">
          <View style={{ position: 'absolute', top: -120, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: hexToRgba('#14B8A6', isDark ? 0.1 : 0.07) }} />
          <View style={{ position: 'absolute', bottom: -140, left: -110, width: 320, height: 320, borderRadius: 160, backgroundColor: hexToRgba('#6366F1', isDark ? 0.08 : 0.05) }} />
        </View>
      )}
      {children}
    </View>
  );

  return (
    <FadeInView index={index} className={cn('min-w-0', className)} style={style}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} className="flex-1">
          {body}
        </Pressable>
      ) : (
        body
      )}
    </FadeInView>
  );
}

const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };

export interface BentoHeaderProps {
  title: string;
  icon?: IconName;
  /** Icon tint — defaults to teal. */
  color?: string;
  /** Right-aligned slot (a count, a link, a button). */
  right?: ReactNode;
  /** Use light text for `ink` / `aurora` tiles. */
  onDark?: boolean;
  className?: string;
}

/** Small icon chip + title row that opens most tiles. */
export function BentoHeader({ title, icon, color = '#14B8A6', right, onDark = false, className }: BentoHeaderProps) {
  return (
    <View className={cn('flex-row items-center gap-2.5', className)}>
      {icon && (
        <View
          className="h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: onDark ? 'rgba(255, 255, 255, 0.12)' : hexToRgba(color, 0.12) }}
        >
          <Icon name={icon} size={16} color={onDark ? '#FFFFFF' : color} />
        </View>
      )}
      <Text
        variant="body"
        color="primary"
        className="flex-1 text-[15px] font-semibold"
        style={onDark ? { color: BENTO_INK_TEXT.primary } : undefined}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

export interface BentoStatProps {
  icon: IconName;
  color: string;
  value: string;
  label: string;
  /** 0-100 — renders a thin progress track under the value. */
  progress?: number;
  onPress?: () => void;
  index?: number;
  className?: string;
}

/** Compact number tile: tinted icon chip, big value, small label. */
export function BentoStat({ icon, color, value, label, progress, onPress, index, className }: BentoStatProps) {
  return (
    <BentoTile onPress={onPress} index={index} className={className} accessibilityLabel={`${label}: ${value}`}>
      <View className="flex-1 justify-between gap-4">
        <View className="flex-row items-center justify-between">
          <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(color, 0.12) }}>
            <Icon name={icon} size={17} color={color} />
          </View>
          {onPress && <Icon name="ArrowUpRight" size={15} />}
        </View>
        <View>
          <Text variant="h2" color="primary" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
            {value}
          </Text>
          <Text variant="body" color="muted" className="mt-0.5 text-[12px] font-medium" numberOfLines={1}>
            {label}
          </Text>
          {progress !== undefined && (
            <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-hover">
              <View style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
            </View>
          )}
        </View>
      </View>
    </BentoTile>
  );
}

export interface BentoRingProps {
  /** 0-100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Track color — defaults to a faint white for use on `ink` tiles. */
  trackColor?: string;
  children?: ReactNode;
}

/** Static aurora progress ring (no animation, so it never jitters on re-render). */
export function BentoRing({ value, size = 120, strokeWidth = 10, trackColor = 'rgba(255, 255, 255, 0.1)', children }: BentoRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="bentoRingAurora" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#14B8A6" />
            <Stop offset="55%" stopColor="#06B6D4" />
            <Stop offset="100%" stopColor="#6366F1" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {clamped > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#bentoRingAurora)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}

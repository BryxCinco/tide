import { LinearGradient } from 'expo-linear-gradient';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { gradientDirections, gradients } from '../../utils/gradients';
import { ocean } from '../../utils/theme';
import Svg,{ Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

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
 * - `glass` ("Tide Ocean"): a translucent, blurred iOS-widget tile meant to sit on
 *   OceanBackdrop. Same text colors as `surface`.
 * - `deep` ("Tide Ocean"): the deep-sea statement tile — teal-navy with lagoon/aqua light
 *   in its corners. Light-on-dark content, like `ink` (use `BENTO_INK_TEXT`).
 * - `lagoon` ("Tide Ocean"): the `gradients.ocean` hero tile, white content — the ocean
 *   counterpart of `aurora`.
 */
export type BentoTone = 'surface' | 'ink' | 'aurora' | 'glow' | 'glass' | 'deep' | 'lagoon';

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
  /** Tighter padding and a 20px iOS-widget radius ("Tide Ocean" density). */
  dense?: boolean;
}

const ENTRANCE_STAGGER_MS = 40;

/**
 * True inside a `dense` BentoTile. Shared pieces rendered deep inside a tile's content (empty
 * and error states) read it to switch to their compact layout, so a dense screen doesn't
 * have to thread a prop through every chart component.
 */
const BentoDensityContext = createContext(false);

/** Whether the nearest BentoTile is `dense`. */
export function useBentoDense(): boolean {
  return useContext(BentoDensityContext);
}

// backdrop-filter only exists on web (react-native-web passes it through); native gets the
// translucent fill without the blur.
const GLASS_BLUR: ViewStyle =
  Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)' } as unknown as ViewStyle) : {};

/**
 * The "Tide Ocean" glass surface (fill, hairline border, web blur, soft deep-sea lift) for
 * cards that can't be a BentoTile — pressable list cards with their own layout. Use with a
 * `border` class and no `bg-surface`.
 */
export function useGlassSurface(): ViewStyle {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  return {
    backgroundColor: isDark ? 'rgba(12, 30, 36, 0.62)' : 'rgba(255, 255, 255, 0.72)',
    borderColor: isDark ? 'rgba(94, 234, 212, 0.09)' : 'rgba(5, 42, 48, 0.07)',
    ...GLASS_BLUR,
    shadowColor: '#052A30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.4 : 0.05,
    shadowRadius: 20,
    elevation: 2,
  };
}

export interface FadeInViewProps {
  children: ReactNode;
  /** Stagger position — each step delays the fade by 40ms (capped). */
  index?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** false renders fully visible immediately — e.g. chat history restored on open. */
  animate?: boolean;
}

/**
 * Opacity-only mount fade (no slide), so content never jumps into place. Uses React Native's
 * core Animated API rather than Reanimated: Reanimated's delayed fades could stall part-way on
 * web when the screen re-rendered mid-animation (e.g. data arriving), leaving tiles half-faded.
 */
export function FadeInView({ children, index = 0, className, style, animate = true }: FadeInViewProps) {
  const opacity = useRef(new RNAnimated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
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
export function BentoTile({ children, tone = 'surface', onPress, index = 0, className, style, accessibilityLabel, dense = false }: BentoTileProps) {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const toneStyle: ViewStyle =
    tone === 'ink'
      ? { backgroundColor: isDark ? '#111A2B' : '#0B1220', borderColor: 'rgba(255, 255, 255, 0.06)' }
      : tone === 'deep'
        ? { backgroundColor: isDark ? ocean.deep.dark : ocean.deep.light, borderColor: 'rgba(94, 234, 212, 0.12)' }
        : tone === 'glass'
          ? {
              backgroundColor: isDark ? 'rgba(12, 30, 36, 0.62)' : 'rgba(255, 255, 255, 0.72)',
              borderColor: isDark ? 'rgba(94, 234, 212, 0.09)' : 'rgba(5, 42, 48, 0.07)',
              ...GLASS_BLUR,
            }
          : tone === 'aurora' || tone === 'lagoon'
            ? { borderColor: 'transparent' }
            : {};

  const isOcean = tone === 'glass' || tone === 'deep' || tone === 'lagoon';
  const shadow: ViewStyle = isOcean
    ? {
        shadowColor: '#052A30',
        shadowOffset: { width: 0, height: tone === 'glass' ? 6 : 10 },
        shadowOpacity: isDark ? 0.4 : tone === 'glass' ? 0.05 : 0.18,
        shadowRadius: tone === 'glass' ? 20 : 26,
        elevation: 2,
      }
    : {
        shadowColor: tone === 'aurora' ? '#06B6D4' : '#0F172A',
        shadowOffset: { width: 0, height: tone === 'aurora' ? 12 : 4 },
        shadowOpacity: tone === 'aurora' ? 0.25 : isDark ? 0.3 : 0.04,
        shadowRadius: tone === 'aurora' ? 24 : 16,
        elevation: 2,
      };

  const body = (
    <View
      className={cn(
        'flex-1 overflow-hidden border',
        dense ? 'rounded-[20px] p-3.5' : 'rounded-[24px] p-5',
        (tone === 'surface' || tone === 'glow') && 'border-subtle bg-surface',
        onPress && 'hover:border-tide-teal/40',
      )}
      style={[toneStyle, shadow]}
    >
      {tone === 'deep' && (
        <View style={[FILL, { overflow: 'hidden' }]} pointerEvents="none">
          <View style={{ position: 'absolute', top: -90, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: hexToRgba(ocean.lagoon, 0.22) }} />
          <View style={{ position: 'absolute', bottom: -110, left: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: hexToRgba(ocean.aqua, 0.12) }} />
        </View>
      )}
      {tone === 'lagoon' && (
        <>
          <LinearGradient colors={[...gradients.ocean]} {...gradientDirections.diagonal} style={FILL} pointerEvents="none" />
          <View style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(94, 234, 212, 0.18)' }} pointerEvents="none" />
        </>
      )}
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
      <BentoDensityContext.Provider value={dense}>
        {onPress ? (
          <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} className="flex-1">
            {body}
          </Pressable>
        ) : (
          body
        )}
      </BentoDensityContext.Provider>
    </FadeInView>
  );
}

const FILL: ViewStyle = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };

// Soft-edged light pools on web; native has no CSS blur, so it gets the gradient only (a
// hard-edged translucent circle would read as a shape, not light).
const BLUR_POOL: ViewStyle = Platform.OS === 'web' ? ({ filter: 'blur(80px)' } as unknown as ViewStyle) : {};

/**
 * "Tide Ocean" page background: a faint aqua-tinted base (light) or the abyss (dark), with
 * light coming down from the surface — a teal wash at the top and, on web, two blurred pools
 * of lagoon/aqua. Render as the first child of a screen; it fills the screen behind content
 * and never takes touches. Glass tiles are tuned to sit on it.
 */
export function OceanBackdrop() {
  const isDark = useThemeStore((s) => s.theme === 'dark');

  return (
    <View style={FILL} pointerEvents="none">
      <View style={[FILL, { backgroundColor: isDark ? ocean.abyss : ocean.shallows }]} />
      <LinearGradient
        colors={isDark ? ['rgba(20, 184, 166, 0.16)', 'rgba(3, 20, 26, 0)'] : ['rgba(94, 234, 212, 0.30)', 'rgba(242, 248, 248, 0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 460 }}
      />
      {Platform.OS === 'web' && (
        <>
          <View style={[{ position: 'absolute', top: -160, right: -120, width: 520, height: 520, borderRadius: 260, backgroundColor: hexToRgba(ocean.aqua, isDark ? 0.1 : 0.14) }, BLUR_POOL]} />
          <View style={[{ position: 'absolute', top: 260, left: -200, width: 480, height: 480, borderRadius: 240, backgroundColor: hexToRgba(ocean.lagoon, isDark ? 0.08 : 0.1) }, BLUR_POOL]} />
        </>
      )}
    </View>
  );
}

export interface BentoHeaderProps {
  title: string;
  icon?: IconName;
  /** Icon tint — defaults to teal. */
  color?: string;
  /** Right-aligned slot (a count, a link, a button). */
  right?: ReactNode;
  /** Use light text for `ink` / `aurora` tiles. */
  onDark?: boolean;
  /** Smaller chip and 13px title, for `dense` tiles. */
  dense?: boolean;
  className?: string;
}

/** Small icon chip + title row that opens most tiles. */
export function BentoHeader({ title, icon, color = '#14B8A6', right, onDark = false, dense = false, className }: BentoHeaderProps) {
  return (
    <View className={cn('flex-row items-center', dense ? 'gap-2' : 'gap-2.5', className)}>
      {icon && (
        <View
          className={cn('items-center justify-center', dense ? 'h-6 w-6 rounded-[8px]' : 'h-8 w-8 rounded-[10px]')}
          style={{ backgroundColor: onDark ? 'rgba(255, 255, 255, 0.12)' : hexToRgba(color, 0.12) }}
        >
          <Icon name={icon} size={dense ? 13 : 16} color={onDark ? '#FFFFFF' : color} strokeWidth={dense ? 2.2 : undefined} />
        </View>
      )}
      <Text
        variant="body"
        color="primary"
        className={cn('flex-1 font-semibold', dense ? 'text-[13px]' : 'text-[15px]')}
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
  /** "Tide Ocean" iOS-widget layout: glass tile, micro label on top, value below. */
  dense?: boolean;
}

/** Compact number tile: tinted icon chip, big value, small label. */
export function BentoStat({ icon, color, value, label, progress, onPress, index, className, dense = false }: BentoStatProps) {
  if (dense) {
    return (
      <BentoTile tone="glass" dense onPress={onPress} index={index} className={className} accessibilityLabel={`${label}: ${value}`}>
        <View className="flex-1 justify-between gap-2.5">
          <View className="flex-row items-center gap-1.5">
            <View className="h-6 w-6 items-center justify-center rounded-[8px]" style={{ backgroundColor: hexToRgba(color, 0.14) }}>
              <Icon name={icon} size={13} color={color} strokeWidth={2.2} />
            </View>
            <Text variant="label" color="muted" className="flex-1 text-[10.5px] tracking-[0.6px]" numberOfLines={1}>
              {label}
            </Text>
            {onPress && <Icon name="ChevronRight" size={13} />}
          </View>
          <View>
            <Text variant="h2" color="primary" className="text-[24px] leading-[28px]" numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
              {value}
            </Text>
            {progress !== undefined && (
              <View className="mt-2 h-1 overflow-hidden rounded-full bg-hover">
                <View style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
              </View>
            )}
          </View>
        </View>
      </BentoTile>
    );
  }

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

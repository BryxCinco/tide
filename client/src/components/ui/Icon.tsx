import * as LucideIcons from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../utils/theme';

/** Names of every icon exported by lucide-react-native, e.g. "Timer", "BookOpen". */
export type IconName = Exclude<
  keyof typeof LucideIcons,
  'Icon' | 'createLucideIcon' | 'LucideProvider' | 'useLucideContext'
>;

export interface IconProps {
  /** Lucide icon name, e.g. `"Timer"` or `"Calendar"`. */
  name: IconName;
  /** Icon size in px. Defaults to 20. */
  size?: number;
  /** Stroke color. Defaults to the muted text color. */
  color?: string;
  /** Stroke width. Defaults to 2 for a consistent line weight across the app. */
  strokeWidth?: number;
  /** Fill color for the icon's interior, e.g. a solid star when favorited. Defaults to "none". */
  fill?: string;
  /** Wraps the icon in a `View` and applies this NativeWind className to it. */
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/** Thin, consistently-stroked wrapper around lucide-react-native icons. */
export function Icon({
  name,
  size = 20,
  color = colors.text.muted,
  strokeWidth = 2,
  fill = 'none',
  className,
  style,
}: IconProps) {
  const LucideIcon = LucideIcons[name] as React.ComponentType<LucideProps> | undefined;
  if (!LucideIcon) {
    return null;
  }

  const icon = <LucideIcon size={size} color={color} strokeWidth={strokeWidth} fill={fill} />;

  if (!className && !style) {
    return icon;
  }

  return (
    <View className={className} style={style}>
      {icon}
    </View>
  );
}

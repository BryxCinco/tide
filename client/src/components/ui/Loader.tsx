import { ActivityIndicator, View } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';

export type LoaderSize = 'sm' | 'md' | 'lg';

export interface LoaderProps {
  /** Defaults to `md`. */
  size?: LoaderSize;
  /** Defaults to the brand teal. */
  color?: string;
  /** Renders as a centered overlay covering the nearest positioned ancestor. */
  fullScreen?: boolean;
  className?: string;
}

const baseSize: Record<LoaderSize, 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
};

const scale: Record<LoaderSize, number> = {
  sm: 1,
  md: 1.4,
  lg: 1,
};

/** ActivityIndicator wrapper with a fullScreen overlay mode. */
export function Loader({ size = 'md', color = colors.brand.tideTeal, fullScreen = false, className }: LoaderProps) {
  const indicator = (
    <View style={{ transform: [{ scale: scale[size] }] }}>
      <ActivityIndicator size={baseSize[size]} color={color} />
    </View>
  );

  if (!fullScreen) {
    return className ? <View className={className}>{indicator}</View> : indicator;
  }

  return (
    <View className={cn('absolute inset-0 items-center justify-center bg-base/80', className)}>{indicator}</View>
  );
}

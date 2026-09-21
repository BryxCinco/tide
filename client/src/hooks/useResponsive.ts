import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  breakpoint: Breakpoint;
}

/**
 * For responsive decisions NativeWind's className breakpoints can't express — an exact
 * numeric size (the circular timer's diameter) or a column count that isn't a clean
 * Tailwind basis fraction (6 columns). Pure layout/spacing should still prefer NativeWind's
 * sm:/md:/lg: classes; reach for this hook only when you need the breakpoint as a JS value.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint = width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'phone';

  return {
    isPhone: breakpoint === 'phone',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    width,
    height,
    breakpoint,
  };
}

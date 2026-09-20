import { View } from 'react-native';

import { cn } from '../../utils/cn';
import { Text } from './Text';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerSpacing = 'sm' | 'md' | 'lg';

export interface DividerProps {
  /** Line direction. Defaults to `horizontal`. */
  orientation?: DividerOrientation;
  /** Margin around the line. Defaults to `md`. */
  spacing?: DividerSpacing;
  /** Optional centered label (e.g. "OR"), horizontal orientation only. */
  label?: string;
  className?: string;
}

const spacingClasses: Record<DividerSpacing, { horizontal: string; vertical: string }> = {
  sm: { horizontal: 'my-2', vertical: 'mx-2' },
  md: { horizontal: 'my-3', vertical: 'mx-3' },
  lg: { horizontal: 'my-4', vertical: 'mx-4' },
};

/** 1px hairline divider, optionally with a centered label for form "OR" breaks. */
export function Divider({ orientation = 'horizontal', spacing = 'md', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return <View className={cn('w-px self-stretch bg-subtle', spacingClasses[spacing].vertical, className)} />;
  }

  if (!label) {
    return <View className={cn('h-px w-full bg-subtle', spacingClasses[spacing].horizontal, className)} />;
  }

  return (
    <View className={cn('flex-row items-center', spacingClasses[spacing].horizontal, className)}>
      <View className="h-px flex-1 bg-subtle" />
      <Text variant="caption" color="muted" className="mx-3">
        {label}
      </Text>
      <View className="h-px flex-1 bg-subtle" />
    </View>
  );
}

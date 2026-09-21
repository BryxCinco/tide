import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '../../utils/cn';

export interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Phone: full-width, 16px padding. Tablet (md, 768px+): 720px centered, 24px padding.
 * Desktop (lg, 1024px+): 1200px centered, 32px padding. Shared by every content screen
 * so the tiered width/padding numbers live in exactly one place.
 */
export function ResponsiveContainer({ children, className }: ResponsiveContainerProps) {
  return (
    <View className={cn('w-full self-center px-4 md:max-w-[720px] md:px-6 lg:max-w-[1200px] lg:px-8', className)}>
      {children}
    </View>
  );
}

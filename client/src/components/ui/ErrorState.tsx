import { View } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { useBentoDense } from './Bento';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Centered failure block with an optional Retry. Inside a `dense` BentoTile it switches to a
 * compact layout on its own — see useBentoDense. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  const dense = useBentoDense();

  return (
    <View className={cn('flex-1 items-center justify-center', dense ? 'px-3 py-5' : 'px-6 py-12', className)}>
      <View
        className={cn(
          'items-center justify-center rounded-full border border-error/30 bg-error/10',
          dense ? 'h-10 w-10' : 'h-16 w-16',
        )}
      >
        <Icon name="AlertCircle" size={dense ? 18 : 28} color={colors.status.error} />
      </View>

      <Text variant="h3" color="primary" className={cn('text-center', dense ? 'mt-2.5 text-[14px]' : 'mt-4')}>
        Something went wrong
      </Text>

      {message && (
        <Text variant="body" color="muted" className={cn('max-w-xs text-center', dense ? 'mt-1 text-[12.5px]' : 'mt-2')}>
          {message}
        </Text>
      )}

      {onRetry && (
        <Button title="Retry" onPress={onRetry} variant="secondary" size={dense ? 'sm' : 'md'} icon="RotateCcw" className={cn('self-center', dense ? 'mt-3' : 'mt-6')} />
      )}
    </View>
  );
}

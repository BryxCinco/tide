import { View } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export interface ErrorStateProps {
  /** The backend/network error message (from getApiErrorMessage), shown under the title. */
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/** Centered error placeholder with a Retry button — the failure-path counterpart to
 * EmptyState.tsx, same layout/spacing so the two read as a matched pair. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-6 py-12', className)}>
      <View className="h-16 w-16 items-center justify-center rounded-full border border-error/30 bg-error/10">
        <Icon name="AlertCircle" size={28} color={colors.status.error} />
      </View>

      <Text variant="h3" color="primary" className="mt-4 text-center">
        Something went wrong
      </Text>

      {message && (
        <Text variant="body" color="muted" className="mt-2 max-w-xs text-center">
          {message}
        </Text>
      )}

      {onRetry && (
        <Button title="Retry" onPress={onRetry} variant="secondary" size="md" icon="RotateCcw" className="mt-6" />
      )}
    </View>
  );
}

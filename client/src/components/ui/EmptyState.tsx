import { View } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Centered placeholder for empty lists/screens, with an optional CTA. */
export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <View className={cn('flex-1 items-center justify-center px-6 py-12', className)}>
      <View className="h-16 w-16 items-center justify-center rounded-full border border-accent bg-tide-teal/10">
        <Icon name={icon} size={28} color={colors.brand.tideTeal} />
      </View>

      <Text variant="h3" color="primary" className="mt-4 text-center">
        {title}
      </Text>

      {description && (
        <Text variant="body" color="muted" className="mt-2 max-w-xs text-center">
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" className="mt-6 self-center" />
      )}
    </View>
  );
}

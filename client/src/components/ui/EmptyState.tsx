import { View } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { useBentoDense } from './Bento';
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

/** Centered "nothing here yet" block. Inside a `dense` BentoTile it switches to a compact
 * layout (smaller icon, tighter spacing) on its own — see useBentoDense. */
export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  const dense = useBentoDense();

  return (
    <View className={cn('flex-1 items-center justify-center', dense ? 'px-3 py-5' : 'px-6 py-12', className)}>
      <View
        className={cn(
          'items-center justify-center rounded-full border border-accent bg-tide-teal/10',
          dense ? 'h-10 w-10 border-tide-teal/30' : 'h-16 w-16',
        )}
      >
        <Icon name={icon} size={dense ? 18 : 28} color={colors.brand.tideTeal} />
      </View>

      <Text variant="h3" color="primary" className={cn('text-center', dense ? 'mt-2.5 text-[14px]' : 'mt-4')}>
        {title}
      </Text>

      {description && (
        <Text variant="body" color="muted" className={cn('max-w-xs text-center', dense ? 'mt-1 text-[12.5px]' : 'mt-2')}>
          {description}
        </Text>
      )}

      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size={dense ? 'sm' : 'md'} className={cn('self-center', dense ? 'mt-3' : 'mt-6')} />
      )}
    </View>
  );
}

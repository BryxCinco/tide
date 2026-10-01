import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { AccentTone, QuickActionItem } from '../../types/dashboard';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Icon, Text } from '../ui';

// 'muted' has no explicit icon color — Icon's own default already resolves to the
// theme-reactive muted tone, so omitting it here (rather than a static light-mode hex)
// keeps it correct in dark mode too.
const tintClasses: Record<AccentTone, { bg: string; icon?: string }> = {
  teal: { bg: 'bg-tide-teal/10', icon: colors.brand.tideTeal },
  blue: { bg: 'bg-ocean-blue/10', icon: colors.brand.oceanBlue },
  purple: { bg: 'bg-deep-purple/10', icon: colors.brand.deepPurple },
  muted: { bg: 'bg-hover' },
  red: { bg: 'bg-error/10', icon: colors.status.error },
};

export interface QuickActionsProps {
  actions: QuickActionItem[];
}

/** 2x2 on phone, 4-across from tablet (md, 768px+) up. */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {actions.map((action) => {
        const tone = tintClasses[action.tint];

        return (
          <Pressable
            key={action.id}
            onPress={() => router.push(action.href as Href)}
            className={cn(
              'items-center gap-3 rounded-xl border border-subtle bg-base p-4',
              'basis-[47%] md:basis-0 md:min-w-[140px] md:flex-1',
              'hover:scale-[1.02] hover:bg-tide-teal/5',
            )}
            style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <View className={cn('h-12 w-12 items-center justify-center rounded-full', tone.bg)}>
              <Icon name={action.icon} size={22} color={tone.icon} />
            </View>
            <Text variant="body" color="primary" className="text-center font-medium">
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

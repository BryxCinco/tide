import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { AccentTone, QuickActionItem } from '../../types/dashboard';
import { hexToRgba } from '../../utils/color';
import { ocean } from '../../utils/theme';
import { BentoTile, Icon, Text } from '../ui';

// 'muted' has no explicit icon color — Icon's own default already resolves to the
// theme-reactive muted tone, so leaving it undefined keeps it correct in dark mode too.
const TINT: Record<AccentTone, string | undefined> = {
  teal: ocean.lagoon,
  blue: ocean.surf,
  purple: ocean.lavender,
  muted: undefined,
  red: '#F87171',
};

export interface QuickActionsProps {
  actions: QuickActionItem[];
}

/** Compact shortcut chips: 2-across on phone, one row from tablet (md, 768px+) up. */
export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <BentoTile tone="glass" dense>
      <View className="flex-row flex-wrap gap-2">
        {actions.map((action) => {
          const tint = TINT[action.tint];
          return (
            <Pressable
              key={action.id}
              onPress={() => router.push(action.href as Href)}
              className="basis-[47%] grow flex-row items-center gap-2 rounded-[12px] border border-subtle px-2.5 py-2 hover:bg-hover md:basis-0"
              style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: tint ? hexToRgba(tint, 0.13) : undefined }}>
                <Icon name={action.icon} size={14} color={tint} strokeWidth={2.2} />
              </View>
              <Text variant="body" color="primary" className="flex-1 text-[12.5px] font-semibold" numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BentoTile>
  );
}

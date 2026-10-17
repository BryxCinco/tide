import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { AccentTone } from '../../types/dashboard';
import type { WeeklySummaryItem } from '../../types/insights';
import { hexToRgba } from '../../utils/color';
import { colors } from '../../utils/theme';
import { Icon, Text } from '../ui';

export interface SummaryCardProps {
  items: WeeklySummaryItem[];
}

const tintColors: Record<AccentTone, string | undefined> = {
  teal: colors.brand.tideTeal,
  blue: colors.brand.oceanBlue,
  purple: colors.brand.deepPurple,
  // 'muted' has no explicit color — Icon's own default already resolves to the
  // theme-reactive muted tone, so omitting it here keeps it correct in dark mode too.
  muted: undefined,
  red: colors.status.error,
};

/** The period's headline numbers as a grid of small tiles — 2 across on phone, all in one
 * row on wide screens. Values in text colors; the tinted icon chip carries the accent. */
export function SummaryCard({ items }: SummaryCardProps) {
  const themeColors = useThemeColors();

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {items.map((item) => {
        const tint = tintColors[item.tint] ?? themeColors.text.muted;
        return (
          <View key={item.id} className="basis-[47%] grow flex-row items-center gap-3 rounded-2xl border border-subtle bg-base p-3 md:basis-[18%]">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(tint, 0.12) }}>
              <Icon name={item.icon} size={16} color={tint} />
            </View>
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text variant="body" color="primary" className="text-[15px] font-semibold" numberOfLines={1}>
                {item.value}
              </Text>
              <Text variant="body" color="muted" className="text-[11px]" numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

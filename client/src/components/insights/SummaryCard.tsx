import { ScrollView, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { AccentTone } from '../../types/dashboard';
import type { WeeklySummaryItem } from '../../types/insights';
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

/** Horizontal chip row (not StatsRow's boxy cards) — the bento 'lg' full-width card's
 * compact "5 mini stats" requirement. Wraps in a horizontal ScrollView unconditionally;
 * on wide screens all 5 chips fit without needing to scroll, so this degrades to a plain
 * row there with no visible behavior difference. */
export function SummaryCard({ items }: SummaryCardProps) {
  const themeColors = useThemeColors();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
      {items.map((item) => (
        <View
          key={item.id}
          className="flex-row items-center gap-3 rounded-xl border border-subtle bg-elevated px-4 py-3"
        >
          <Icon name={item.icon} size={18} color={tintColors[item.tint] ?? themeColors.text.muted} />
          <View>
            <Text variant="body" color="primary" className="font-semibold" numberOfLines={1}>
              {item.value}
            </Text>
            <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

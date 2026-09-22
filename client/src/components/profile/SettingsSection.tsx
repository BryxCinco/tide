import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { BentoCard, type BentoCardSize } from '../insights/BentoCard';
import type { IconName } from '../ui';

export interface SettingsSectionProps {
  title: string;
  icon: IconName;
  /** `sm` = one grid column, `wide` = spans both — this page's grid stays at 2 columns at
   * every breakpoint (`md:grid-cols-2`, no `lg:grid-cols-4`), so `wide` (col-span-2 at both
   * md and lg) is the "full width" size here, not BentoCard's `lg` (col-span-4 at lg,
   * which assumes a 4-column grid and would overflow this one). Defaults to `wide` since
   * most sections here have several rows. */
  size?: Extract<BentoCardSize, 'sm' | 'wide'>;
  children: ReactNode;
}

/**
 * A settings group as a bento tile — reuses Insights' `BentoCard` for the card chrome
 * (icon+title header, rounded-2xl, shadow, theme-aware white/surface background) instead
 * of re-implementing it, since "make it bento grid" means this should visually match the
 * Insights screen's cards exactly, not just gesture at the idea. The row list bleeds to
 * the card's edges (`-mx-6`, canceling BentoCard's own `p-6`) so each `SettingsItem`'s
 * bottom divider spans the full card width — SettingsItem's own horizontal padding (px-6)
 * picks the inset back up so row content still lines up under the header's icon/title.
 */
export function SettingsSection({ title, icon, size = 'wide', children }: SettingsSectionProps) {
  const items = Children.toArray(children);

  return (
    <BentoCard title={title} icon={icon} size={size}>
      <View className="-mx-6">
        {items.map((child, index) =>
          isValidElement(child)
            ? cloneElement(child as ReactElement<{ isLast?: boolean }>, { isLast: index === items.length - 1 })
            : child,
        )}
      </View>
    </BentoCard>
  );
}

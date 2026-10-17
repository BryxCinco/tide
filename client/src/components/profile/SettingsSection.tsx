import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';

import { BentoHeader, BentoTile, type IconName } from '../ui';

export interface SettingsSectionProps {
  title: string;
  icon: IconName;
  /** Header icon tint — each section gets its own color so the grid reads at a glance. */
  color?: string;
  /** Stagger position for the tile's fade-in. */
  index?: number;
  className?: string;
  children: ReactNode;
}

/**
 * A settings group as a bento tile: colored icon header, then its rows edge to edge
 * (`-mx-5` cancels the tile's own padding so each row's divider spans the full width;
 * SettingsItem's own `px-5` restores the inset for the row content).
 */
export function SettingsSection({ title, icon, color, index, className, children }: SettingsSectionProps) {
  const items = Children.toArray(children);

  return (
    <BentoTile index={index} className={className}>
      <View className="gap-2">
        <BentoHeader title={title} icon={icon} color={color} />
        <View className="-mx-5 -mb-2">
          {items.map((child, i) =>
            isValidElement(child)
              ? cloneElement(child as ReactElement<{ isLast?: boolean; color?: string }>, { isLast: i === items.length - 1, color })
              : child,
          )}
        </View>
      </View>
    </BentoTile>
  );
}

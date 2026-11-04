import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { Icon, Text, type IconName } from '../ui';

export interface SettingsItemProps {
  icon: IconName;
  label: string;
  description?: string;
  /** Red icon tile + red label, for "Delete Account" and similar irreversible actions. */
  danger?: boolean;
  /** No chevron, no press feedback, muted — for a read-only row like "App Version". */
  disabled?: boolean;
  onPress?: () => void;
  /** Trailing content — a value label, `<SettingsSwitch />`, a small segmented control.
   * Defaults to a chevron when `onPress` is given and this is left empty. */
  right?: ReactNode;
  /** Set by `SettingsSection`, not passed directly — drops the row's bottom border on the
   * last item in its group. */
  isLast?: boolean;
  /** Set by `SettingsSection` — the section's accent color for the icon tile. */
  color?: string;
}

/** One row in a Settings section: icon, label (+ optional description), trailing control.
 * Always rendered inside `SettingsSection`, which supplies `isLast` and the shared card
 * border/background around the whole group. */
export function SettingsItem({ icon, label, description, danger = false, disabled = false, onPress, right, isLast = false, color }: SettingsItemProps) {
  const themeColors = useThemeColors();
  const isPressable = Boolean(onPress) && !disabled;
  const accent = danger ? themeColors.status.error : (color ?? themeColors.brand.tideTeal);

  const content = (
    <View
      className={cn(
        'flex-row items-center gap-2.5 px-3.5 py-2.5',
        !isLast && 'border-b border-subtle',
        disabled && 'opacity-60',
      )}
    >
      <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ backgroundColor: hexToRgba(accent, 0.13) }}>
        <Icon name={icon} size={15} color={accent} />
      </View>

      <View className="flex-1 gap-0.5">
        <Text variant="body" color="primary" className={cn('text-[13.5px] font-medium', danger && 'text-error')}>
          {label}
        </Text>
        {description && (
          <Text variant="body" color="muted" className="text-[11.5px]">
            {description}
          </Text>
        )}
      </View>

      <View className="flex-shrink flex-row items-center justify-end gap-2" style={{ maxWidth: '55%' }}>
        {right ?? (isPressable && <Icon name="ChevronRight" size={18} color={themeColors.text.disabled} />)}
      </View>
    </View>
  );

  if (!isPressable) {
    return content;
  }

  return (
    <Pressable onPress={onPress} className="hover:bg-hover">
      {content}
    </Pressable>
  );
}

import { useRef, useState, type ReactNode } from 'react';
import { Modal as RNModal, Platform, Pressable as RNPressable, View, useWindowDimensions } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { darkVars, lightVars } from '../../utils/themeVars';
import { Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';

export interface PopoverProps {
  /** The always-visible trigger (a chip, a cell value). */
  trigger: ReactNode;
  /** Popover body; receives `close` so a choice can dismiss it. */
  children: (close: () => void) => ReactNode;
  width?: number;
  disabled?: boolean;
  accessibilityLabel: string;
}

/**
 * Small anchored menu. Rendered in a transparent RN Modal positioned from the trigger's
 * window coordinates, so it is never clipped by a card's overflow or a scroll view.
 */
export function Popover({ trigger, children, width = 200, disabled, accessibilityLabel }: PopoverProps) {
  const anchor = useRef<View>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const { width: winW, height: winH } = useWindowDimensions();

  const theme = useThemeColors();
  // RN Modal portals outside the app root, so the theme's CSS variables must be re-applied.
  const isDark = useThemeStore((st) => st.theme === 'dark');

  const place = (x: number, y: number, h: number) => {
    const left = Math.max(8, Math.min(x, winW - width - 8));
    // Open upwards (anchored by its bottom edge) when there isn't room below.
    setPos(y + h + 280 > winH ? { bottom: winH - y + 4, left } : { top: y + h + 4, left });
  };

  const open = () => {
    // On web, the viewport rect is exact; measureInWindow can be off when the page scrolls.
    const node = anchor.current as unknown as { getBoundingClientRect?: () => DOMRect } | null;
    if (Platform.OS === 'web' && node?.getBoundingClientRect) {
      const r = node.getBoundingClientRect();
      place(r.left, r.top, r.height);
      return;
    }
    anchor.current?.measureInWindow((x, y, _w, h) => place(x, y, h));
  };
  const close = () => setPos(null);

  return (
    <>
      <View ref={anchor} collapsable={false}>
        <Pressable
          onPress={open}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          className="rounded-md"
        >
          {trigger}
        </Pressable>
      </View>
      <RNModal visible={pos !== null} transparent animationType="fade" onRequestClose={close}>
        <RNPressable style={[{ flex: 1 }, isDark ? darkVars : lightVars]} onPress={close} accessibilityLabel="Close menu">
          {pos && (
            <RNPressable
              onPress={(e) => e.stopPropagation()}
              style={{ position: 'absolute', top: pos.top, bottom: pos.bottom, left: pos.left, width, backgroundColor: theme.background.elevated, borderColor: theme.border.default, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}
              className="rounded-2xl border border-default bg-elevated py-1.5"
            >
              {children(close)}
            </RNPressable>
          )}
        </RNPressable>
      </RNModal>
    </>
  );
}

export interface OptionListProps<V extends string> {
  options: { value: V; label: string; color: string }[];
  value: V;
  onSelect: (value: V) => void;
}

/** Notion-style select list: colored dot, label, check on the current value. */
export function OptionList<V extends string>({ options, value, onSelect }: OptionListProps<V>) {
  const theme = useThemeColors();
  return (
    <View>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          accessibilityRole="menuitem"
          accessibilityState={{ selected: opt.value === value }}
          className="mx-1.5 flex-row items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-[rgba(100,116,139,0.10)]"
        >
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
          <Text variant="body" color="primary" className="flex-1 text-[14px]">
            {opt.label}
          </Text>
          {opt.value === value && <Icon name="Check" size={15} color={theme.brand.tideTeal} />}
        </Pressable>
      ))}
    </View>
  );
}

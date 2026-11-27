import { useRef, useState, type ReactNode } from 'react';
import { Modal as RNModal, Pressable as RNPressable, View, useWindowDimensions } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const { width: winW, height: winH } = useWindowDimensions();

  const open = () => {
    anchor.current?.measureInWindow((x, y, _w, h) => {
      const left = Math.max(8, Math.min(x, winW - width - 8));
      // Open upwards when there isn't room below.
      const top = y + h + 300 > winH ? Math.max(8, y - 300) : y + h + 4;
      setPos({ top, left });
    });
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
        <RNPressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close menu">
          {pos && (
            <RNPressable
              onPress={(e) => e.stopPropagation()}
              style={{ position: 'absolute', top: pos.top, left: pos.left, width, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }}
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

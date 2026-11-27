import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useThemeColors } from '../../../hooks/useThemeColors';
import type { BlockType } from '../../../utils/blocks';
import { hexToRgba } from '../../../utils/color';
import { gradientDirections, gradients } from '../../../utils/gradients';
import { Icon, type IconName, Text } from '../../ui';
import { Pressable } from '../../ui/SoundPressable';

export interface SlashItem {
  type: BlockType;
  label: string;
  hint: string;
  icon: IconName;
  keywords: string[];
}

export const SLASH_ITEMS: SlashItem[] = [
  { type: 'text', label: 'Text', hint: 'Plain paragraph', icon: 'Type', keywords: ['paragraph', 'plain'] },
  { type: 'h1', label: 'Heading 1', hint: 'Big section title', icon: 'Heading1', keywords: ['title', 'h1', '#'] },
  { type: 'h2', label: 'Heading 2', hint: 'Medium heading', icon: 'Heading2', keywords: ['subtitle', 'h2', '##'] },
  { type: 'h3', label: 'Heading 3', hint: 'Small heading', icon: 'Heading3', keywords: ['h3', '###'] },
  { type: 'todo', label: 'To-do', hint: 'Track it with a checkbox', icon: 'SquareCheck', keywords: ['todo', 'task', 'check', 'checkbox', '[]'] },
  { type: 'bullet', label: 'Bulleted list', hint: 'A simple list', icon: 'List', keywords: ['bullet', 'unordered', '-'] },
  { type: 'numbered', label: 'Numbered list', hint: 'A list with numbers', icon: 'ListOrdered', keywords: ['number', 'ordered', '1.'] },
  { type: 'quote', label: 'Quote', hint: 'Capture a thought', icon: 'Quote', keywords: ['quote', 'blockquote', '>'] },
  { type: 'divider', label: 'Divider', hint: 'Separate sections', icon: 'Minus', keywords: ['divider', 'line', 'hr', '---'] },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((item) => item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)));
}

export interface SlashMenuProps {
  items: SlashItem[];
  activeIndex: number;
  onSelect: (item: SlashItem) => void;
  onHover?: (index: number) => void;
}

/** The "/" command list, shown inline right under the block being typed in. */
export function SlashMenu({ items, activeIndex, onSelect, onHover }: SlashMenuProps) {
  const theme = useThemeColors();

  return (
    <View
      className="my-1 max-w-[340px] overflow-hidden rounded-2xl border border-default bg-elevated py-1.5"
      style={{ shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
    >
      <Text variant="label" color="muted" className="px-3 pb-1 pt-1 text-[10.5px]" style={{ letterSpacing: 1.2 }}>
        {items.length ? 'Basic blocks' : 'No matches'}
      </Text>
      {items.map((item, i) => {
        const active = i === activeIndex;
        return (
          <Pressable
            key={item.type}
            onPress={() => onSelect(item)}
            onHoverIn={() => onHover?.(i)}
            accessibilityRole="menuitem"
            accessibilityLabel={item.label}
            className="mx-1.5 overflow-hidden rounded-xl"
          >
            {active && (
              <LinearGradient
                colors={gradients.aurora.map((c) => hexToRgba(c, 0.14)) as unknown as [string, string, ...string[]]}
                {...gradientDirections.horizontal}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            )}
            <View className="flex-row items-center gap-3 px-2 py-1.5">
              <View className="h-8 w-8 items-center justify-center rounded-lg border border-default bg-surface">
                <Icon name={item.icon} size={16} color={active ? theme.brand.tideTeal : theme.text.secondary} />
              </View>
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text variant="body" color="primary" className="text-[14px] font-medium">
                  {item.label}
                </Text>
                <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={1}>
                  {item.hint}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

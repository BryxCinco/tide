import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';
import { Platform, View, type NativeSyntheticEvent, type TextInput as RNTextInput, type TextInputKeyPressEventData, type TextInputSelectionChangeEventData } from 'react-native';

import { useThemeColors } from '../../../hooks/useThemeColors';
import type { Block } from '../../../utils/blocks';
import { cn } from '../../../utils/cn';
import { ocean } from '../../../utils/theme';
import { Icon, Text } from '../../ui';
import { Pressable } from '../../ui/SoundPressable';
import { TextInput } from '../../ui/SoundTextInput';

/**
 * Web textareas never shrink to their content on their own (scrollHeight is at least the
 * current height), so size them by hand after every change. Native multiline inputs grow by
 * themselves / via onContentSizeChange, so this is a no-op there.
 */
export function useAutoGrowOnWeb(input: React.RefObject<RNTextInput | null>, dep: string, minHeight: number) {
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = input.current as unknown as HTMLTextAreaElement | null;
    if (!el?.style) return;
    // Collapsing to 0px briefly shortens the page, and the scroll container clamps its
    // scrollTop — restore every scrolled ancestor so a long entry doesn't jump while typing.
    const scrolled: [HTMLElement, number][] = [];
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.scrollTop > 0) scrolled.push([p, p.scrollTop]);
    }
    el.style.height = '0px';
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
    for (const [p, top] of scrolled) p.scrollTop = top;
  }, [input, dep, minHeight]);
}

/** Font size / line height per block type. Text matches the old editor's 16/27. */
const TYPE_STYLE: Record<Block['type'], { fontSize: number; lineHeight: number; className: string }> = {
  text: { fontSize: 16, lineHeight: 27, className: 'text-secondary' },
  h1: { fontSize: 28, lineHeight: 36, className: 'font-bold text-primary' },
  h2: { fontSize: 22, lineHeight: 30, className: 'font-bold text-primary' },
  h3: { fontSize: 18, lineHeight: 26, className: 'font-semibold text-primary' },
  todo: { fontSize: 16, lineHeight: 27, className: 'text-secondary' },
  bullet: { fontSize: 16, lineHeight: 27, className: 'text-secondary' },
  numbered: { fontSize: 16, lineHeight: 27, className: 'text-secondary' },
  quote: { fontSize: 17, lineHeight: 28, className: 'italic text-primary' },
  divider: { fontSize: 16, lineHeight: 27, className: '' },
};

export interface BlockRowProps {
  block: Block;
  /** 1-based position in its numbered run (only used by numbered blocks). */
  number: number;
  placeholder?: string;
  /** Measured content height, so multiline inputs grow with their text on every platform. */
  height?: number;
  onChangeText: (text: string) => void;
  onKeyPress: (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => void;
  onSelectionChange: (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
  onSubmit: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onHeight: (height: number) => void;
  onToggleTodo: () => void;
}

export const BlockRow = forwardRef<RNTextInput, BlockRowProps>(function BlockRow(
  { block, number, placeholder, height, onChangeText, onKeyPress, onSelectionChange, onSubmit, onFocus, onBlur, onHeight, onToggleTodo },
  ref,
) {
  const theme = useThemeColors();
  const style = TYPE_STYLE[block.type];
  const isWeb = Platform.OS === 'web';

  const local = useRef<RNTextInput | null>(null);
  const setRefs = useCallback(
    (node: RNTextInput | null) => {
      local.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  useAutoGrowOnWeb(local, block.text + block.type, style.lineHeight);

  if (block.type === 'divider') {
    return (
      <View className="py-3">
        <View className="h-px bg-[rgba(100,116,139,0.25)]" />
      </View>
    );
  }

  const topGap = block.type === 'h1' ? 'mt-4' : block.type === 'h2' ? 'mt-3' : block.type === 'h3' ? 'mt-2' : '';
  const done = block.type === 'todo' && block.checked;

  return (
    <View className={cn('flex-row items-start', topGap)}>
      {block.type === 'todo' && (
        <Pressable
          onPress={onToggleTodo}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!block.checked }}
          accessibilityLabel={block.checked ? 'Mark not done' : 'Mark done'}
          className="mr-2.5 items-center justify-center"
          style={{ height: style.lineHeight }}
        >
          <View
            className={cn('h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px]', block.checked ? 'border-transparent' : 'border-[rgba(100,116,139,0.6)]')}
            style={block.checked ? { backgroundColor: ocean.lagoon } : undefined}
          >
            {block.checked && <Icon name="Check" size={13} strokeWidth={3} color="#FFFFFF" />}
          </View>
        </Pressable>
      )}
      {block.type === 'bullet' && (
        <View className="mr-2.5 w-[18px] items-center justify-center" style={{ height: style.lineHeight }}>
          <View className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: theme.text.secondary }} />
        </View>
      )}
      {block.type === 'numbered' && (
        <View className="mr-1.5 min-w-[22px]" style={{ height: style.lineHeight, justifyContent: 'center' }}>
          <Text variant="body" color="secondary" style={{ fontSize: 16, fontVariant: ['tabular-nums'] }}>
            {number}.
          </Text>
        </View>
      )}
      {block.type === 'quote' && <View className="mr-3 w-[3px] self-stretch rounded-full" style={{ backgroundColor: ocean.lagoon }} />}

      <TextInput
        ref={setRefs}
        value={block.text}
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        onSelectionChange={onSelectionChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.text.disabled}
        multiline
        scrollEnabled={false}
        // Native: Return submits (splits the block) instead of inserting a newline. Web
        // handles Enter in onKeyPress instead, so it isn't wired twice.
        {...(isWeb ? {} : { submitBehavior: 'submit' as const, onSubmitEditing: onSubmit })}
        onContentSizeChange={isWeb ? undefined : (e) => onHeight(e.nativeEvent.contentSize.height)}
        textAlignVertical="top"
        className={cn('flex-1 p-0 font-sans', style.className, done && 'text-muted line-through')}
        style={{
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          minHeight: style.lineHeight,
          ...(!isWeb && height ? { height: Math.max(style.lineHeight, height) } : {}),
          paddingVertical: 1,
        }}
      />
    </View>
  );
});

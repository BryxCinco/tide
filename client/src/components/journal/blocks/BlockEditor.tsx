import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, View, type TextInput as RNTextInput } from 'react-native';

import {
  mergeWithPrevious,
  numberedIndex,
  parseBlocks,
  serializeBlocks,
  setBlockType,
  splitBlock,
  toggleTodo,
  updateBlockText,
  type Block,
  type BlockType,
  type EditResult,
} from '../../../utils/blocks';
import { BlockRow } from './BlockRow';
import { filterSlashItems, SlashMenu, type SlashItem } from './SlashMenu';

export interface BlockEditorProps {
  /** Markdown, read once on mount — the editor owns its blocks after that. */
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** Lets the screen show a keyboard toolbar while a block is being edited. */
  onFocusChange?: (focused: boolean) => void;
}

/** Commands the phone keyboard toolbar sends to the block being edited. */
export interface BlockEditorHandle {
  setType: (type: BlockType) => void;
  cycleHeading: () => void;
  openSlash: () => void;
}

const DEFAULT_PLACEHOLDER = "Write, or press '/' for commands";
const HEADING_CYCLE: Record<BlockType, BlockType> = {
  text: 'h1', h1: 'h2', h2: 'h3', h3: 'text', todo: 'h1', bullet: 'h1', numbered: 'h1', quote: 'h1', divider: 'h1',
};

/**
 * Notion-style page body: one borderless input per block, `/` for the command menu and
 * markdown shortcuts (`#`, `[]`, `-`, `1.`, `>`, `---`) at the start of a line. All of the
 * editing rules live in utils/blocks.ts (unit-tested); this component only wires keys,
 * focus and caret to them.
 */
export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(function BlockEditor(
  { value, onChange, placeholder = DEFAULT_PLACEHOLDER, onFocusChange },
  ref,
) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(value));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [slashActive, setSlashActive] = useState(0);
  const [slashDismissedFor, setSlashDismissedFor] = useState<string | null>(null);

  const inputs = useRef(new Map<string, RNTextInput>());
  const selections = useRef(new Map<string, number>());
  const pendingFocus = useRef<{ id: string; caret: number } | null>(null);
  const lastFocused = useRef<number>(0);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Skip the very first render: parsing then re-serializing must not count as an edit.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onChange(serializeBlocks(blocks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // Move focus/caret after a structural edit, once the new input has mounted.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    const input = inputs.current.get(target.id);
    if (!input) return;
    pendingFocus.current = null;
    input.focus();
    // setSelection exists on RN's TextInput instance; guard for platforms that lack it.
    (input as unknown as { setSelection?: (s: number, e: number) => void }).setSelection?.(target.caret, target.caret);
    selections.current.set(target.id, target.caret);
  });

  const apply = useCallback((result: EditResult) => {
    const focusBlock = result.blocks[result.focusIndex];
    if (focusBlock) pendingFocus.current = { id: focusBlock.id, caret: result.caret ?? focusBlock.text.length };
    setBlocks(result.blocks);
  }, []);

  const focusedIndex = blocks.findIndex((b) => b.id === focusedId);
  const focusedBlock = focusedIndex >= 0 ? blocks[focusedIndex] : null;
  const slashQuery =
    focusedBlock && focusedBlock.type === 'text' && focusedBlock.text.startsWith('/') && slashDismissedFor !== focusedBlock.id
      ? focusedBlock.text.slice(1)
      : null;
  const slashItems = useMemo(() => (slashQuery === null ? [] : filterSlashItems(slashQuery)), [slashQuery]);

  const chooseSlash = (index: number, item: SlashItem) => {
    const cleared = updateBlockText(blocksRef.current, index, '');
    apply(setBlockType(cleared, index, item.type));
    setSlashActive(0);
  };

  const handleKeyPress = (index: number, e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
    const block = blocksRef.current[index];
    const key = e.nativeEvent.key;
    const caret = selections.current.get(block.id) ?? block.text.length;
    const isWeb = Platform.OS === 'web';

    if (slashQuery !== null && index === focusedIndex) {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault?.();
        const n = Math.max(slashItems.length, 1);
        setSlashActive((a) => (key === 'ArrowDown' ? (a + 1) % n : (a - 1 + n) % n));
        return;
      }
      if (key === 'Enter' && slashItems.length > 0) {
        e.preventDefault?.();
        chooseSlash(index, slashItems[Math.min(slashActive, slashItems.length - 1)]);
        return;
      }
      if (key === 'Escape') {
        e.preventDefault?.();
        setSlashDismissedFor(block.id);
        return;
      }
    }

    if (isWeb && key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      apply(splitBlock(blocksRef.current, index, caret));
      return;
    }

    if (key === 'Backspace' && caret === 0 && (selections.current.get(`${block.id}:end`) ?? 0) === 0) {
      if (index === 0 && block.type === 'text') return;
      e.preventDefault?.();
      apply(mergeWithPrevious(blocksRef.current, index));
      return;
    }

    if (isWeb && (key === 'ArrowUp' || key === 'ArrowDown')) {
      const target = key === 'ArrowUp' ? index - 1 : index + 1;
      const atEdge = key === 'ArrowUp' ? caret === 0 : caret === block.text.length;
      const targetBlock = blocksRef.current[target];
      if (atEdge && targetBlock) {
        e.preventDefault?.();
        // Dividers have no input — skip over them.
        const skip = targetBlock.type === 'divider' ? blocksRef.current[key === 'ArrowUp' ? target - 1 : target + 1] : targetBlock;
        if (skip) {
          pendingFocus.current = { id: skip.id, caret: key === 'ArrowUp' ? skip.text.length : 0 };
          setBlocks((b) => b.slice());
        }
      }
    }
  };

  useImperativeHandle(ref, () => ({
    setType: (type) => {
      const i = lastFocused.current;
      if (blocksRef.current[i]) apply(setBlockType(blocksRef.current, i, type));
    },
    cycleHeading: () => {
      const i = lastFocused.current;
      const block = blocksRef.current[i];
      if (block) apply(setBlockType(blocksRef.current, i, HEADING_CYCLE[block.type]));
    },
    openSlash: () => {
      const i = lastFocused.current;
      const block = blocksRef.current[i];
      if (!block) return;
      let next = blocksRef.current;
      let at = i;
      // Slash commands start on an empty text block — make one below if needed.
      if (block.type !== 'text' || block.text !== '') {
        const split = splitBlock(next, i, block.text.length);
        next = split.blocks;
        at = split.focusIndex;
        if (next[at].type !== 'text') next = setBlockType(next, at, 'text').blocks;
      }
      next = updateBlockText(next, at, '/');
      setSlashDismissedFor(null);
      apply({ blocks: next, focusIndex: at, caret: 1 });
    },
  }));

  const showPlaceholderOn = (block: Block, index: number) =>
    block.type === 'text' && block.text === '' && (block.id === focusedId || (blocks.length === 1 && index === 0));

  return (
    <View className="gap-1">
      {blocks.map((block, index) => (
        <View key={block.id}>
          <BlockRow
            ref={(node) => {
              if (node) inputs.current.set(block.id, node);
              else inputs.current.delete(block.id);
            }}
            block={block}
            number={block.type === 'numbered' ? numberedIndex(blocks, index) : 0}
            placeholder={showPlaceholderOn(block, index) ? placeholder : undefined}
            height={heights[block.id]}
            onChangeText={(text) => {
              setSlashActive(0);
              if (!text.startsWith('/')) setSlashDismissedFor(null);
              const next = updateBlockText(blocksRef.current, index, text);
              // "---" adds a block after the divider — move the caret there.
              if (next.length > blocksRef.current.length) apply({ blocks: next, focusIndex: index + 1, caret: 0 });
              else setBlocks(next);
            }}
            onKeyPress={(e) => handleKeyPress(index, e as unknown as Parameters<typeof handleKeyPress>[1])}
            onSelectionChange={(e) => {
              selections.current.set(block.id, e.nativeEvent.selection.start);
              selections.current.set(`${block.id}:end`, e.nativeEvent.selection.end);
            }}
            onSubmit={() => {
              if (slashQuery !== null && index === focusedIndex && slashItems.length > 0) {
                chooseSlash(index, slashItems[Math.min(slashActive, slashItems.length - 1)]);
                return;
              }
              apply(splitBlock(blocksRef.current, index, selections.current.get(block.id) ?? block.text.length));
            }}
            onFocus={() => {
              lastFocused.current = index;
              setFocusedId(block.id);
              onFocusChange?.(true);
            }}
            onBlur={() => {
              // Delayed so a tap on the slash menu (which blurs the input on native) lands
              // before the menu unmounts.
              setTimeout(() => {
                setFocusedId((id) => (id === block.id ? null : id));
                onFocusChange?.(false);
              }, 150);
            }}
            onHeight={(h) => setHeights((prev) => (prev[block.id] === h ? prev : { ...prev, [block.id]: h }))}
            onToggleTodo={() => setBlocks(toggleTodo(blocksRef.current, index))}
          />
          {slashQuery !== null && index === focusedIndex && (
            <SlashMenu
              items={slashItems}
              activeIndex={Math.min(slashActive, Math.max(slashItems.length - 1, 0))}
              onHover={setSlashActive}
              onSelect={(item) => chooseSlash(index, item)}
            />
          )}
        </View>
      ))}
    </View>
  );
});
